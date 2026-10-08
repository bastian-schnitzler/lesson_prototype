/**
 * Refreshes the published GitHub backlog from docs/ISSUES.md and docs/SPEC.md
 * (SPEC "Keep GitHub issues synchronized").
 *
 *   node scripts/issues-sync.ts [--dry-run]
 *
 * Updates milestone descriptions and every mapped issue's title, milestone and
 * body (scope, acceptance, dependency links, Mermaid flows, PlantUML sources
 * with server-rendered previews, screenshot links), pinned to the current
 * commit. Unmapped IDs get new issues; add the printed rows to the mapping
 * table in ISSUES.md. Requires `gh` access and a clean, pushed docs/ tree.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { deflateRawSync } from 'node:zlib';

const ROOT = resolve(import.meta.dirname, '..');
const REPO = 'bastian-schnitzler/lesson_prototype';

export interface BacklogIssue {
  id: string;
  title: string;
  milestone: string;
  text: string;
}

export interface Assets {
  sections: string[];
  mockups: [label: string, path: string][];
}

const SCREENSHOTS: Record<string, string> = {
  R1: '01-landing.png',
  R2: '02-setup.png',
  R3: '03-language-start.png',
  R4: '04-exam.png',
  R5: '05-results.png',
};

/** Screenshot references per issue (ISSUES.md "Assets to include"). */
export const SCREENSHOT_REFS: Record<string, string[]> = {
  'P1-01': ['R1', 'R2', 'R3', 'R4', 'R5'],
  'P1-06': ['R1', 'R2'],
  'P1-08': ['R1', 'R2'],
  'P1-09': ['R3', 'R4', 'R5'],
  'P1-11': ['R4'],
  'P1-12': ['R1', 'R2'],
  'P2-02': ['R4'],
  'P2-03': ['R4', 'R5'],
  'P2-04': ['R3', 'R4', 'R5'],
  'P2-05': ['R3', 'R4', 'R5'],
  'P3-02': ['R4'],
  'P3-03': ['R4'],
  'P3-04': ['R4'],
  'P3-05': ['R4', 'R5'],
  'P3-06': ['R3', 'R4', 'R5'],
  'P3-07': ['R3', 'R4', 'R5'],
  'P3-08': ['R3', 'R4', 'R5'],
};

export function parseIssues(md: string): BacklogIssue[] {
  const heads = [...md.matchAll(/^### (P\d-\d\d): (.+)$/gm)];
  return heads.map((m, i) => {
    const start = m.index! + m[0].length;
    let end = i + 1 < heads.length ? heads[i + 1].index! : md.length;
    const section = /^## /m.exec(md.slice(start, end));
    if (section) end = start + section.index;
    const text = md
      .slice(start, end)
      .replace(/^GitHub: \[#\d+\]\([^)]*\)\.\n\n?/m, '')
      .trim();
    const milestone = /Milestone: \*\*(Phase \d)\*\*\./.exec(text)?.[1];
    if (!milestone) throw new Error(`${m[1]} has no milestone line`);
    return { id: m[1], title: `${m[1]}: ${m[2]}`, milestone, text };
  });
}

export function parseMapping(md: string): Map<string, number> {
  const out = new Map<string, number>();
  const section = md.slice(md.indexOf('## Published issue mapping'));
  for (const m of section.matchAll(/^\| (P\d-\d\d) \| \[#(\d+)\]/gm)) out.set(m[1], Number(m[2]));
  return out;
}

export function parsePhases(spec: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of spec.matchAll(/^\| (\d) \| ([^|]+) \| ([^|]+) \|$/gm)) {
    out.set(`Phase ${m[1]}`, `${m[2].trim()}. Exit criteria: ${m[3].trim()}`);
  }
  return out;
}

export function parseMermaid(spec: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of spec.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    const sections = [...spec.slice(0, m.index).matchAll(/^## (\d+)\./gm)];
    out.set(sections[sections.length - 1][1], m[1]);
  }
  return out;
}

export function parseAssets(md: string): Map<string, Assets> {
  const out = new Map<string, Assets>();
  const table = md.slice(md.indexOf('| Issues | Mermaid flow | Mockups |'));
  for (const line of table.split('\n').slice(2)) {
    if (!line.startsWith('|')) break;
    const [ids, flows, mockups] = line.replace(/^\||\|$/g, '').split('|');
    for (const id of ids.match(/P\d-\d\d/g) ?? []) {
      const a = out.get(id) ?? { sections: [], mockups: [] };
      for (const [, s] of flows.matchAll(/section (\d+)/g)) if (!a.sections.includes(s)) a.sections.push(s);
      for (const [, label, path] of mockups.matchAll(/\[([^\]]+)\]\((mockups\/[^)]+\.puml)\)/g)) {
        if (!a.mockups.some(([, p]) => p === path)) a.mockups.push([label, path]);
      }
      out.set(id, a);
    }
  }
  return out;
}

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

/** PlantUML server URL (raw deflate + PlantUML's base64 alphabet). */
export function plantumlUrl(source: string, format = 'svg'): string {
  const data = deflateRawSync(Buffer.from(source, 'utf8'), { level: 9 });
  const padded = Buffer.concat([data, Buffer.alloc((3 - (data.length % 3)) % 3)]);
  let out = '';
  for (let i = 0; i < padded.length; i += 3) {
    const [b1, b2, b3] = [padded[i], padded[i + 1], padded[i + 2]];
    out += ALPHABET[b1 >> 2] + ALPHABET[((b1 & 3) << 4) | (b2 >> 4)] + ALPHABET[((b2 & 15) << 2) | (b3 >> 6)] + ALPHABET[b3 & 63];
  }
  return `https://www.plantuml.com/plantuml/${format}/${out}`;
}

function anchor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\- ]/gu, '')
    .replace(/ /g, '-');
}

export interface BodyContext {
  sha: string;
  specVersion: string;
  mapping: Map<string, number>;
  assets: Map<string, Assets>;
  mermaid: Map<string, string>;
  readSource: (path: string) => string;
}

export function issueBody(issue: BacklogIssue, ctx: BodyContext): string {
  const blob = `https://github.com/${REPO}/blob/${ctx.sha}`;
  const text = issue.text
    .replace(/\]\(((?:SPEC|ISSUES)\.md[^)]*|mockups\/[^)]*)\)/g, (_, p: string) => `](${blob}/docs/${p})`)
    .replace(/\bP\d-\d\d\b/g, (id) => (id !== issue.id && ctx.mapping.has(id) ? `${id} (#${ctx.mapping.get(id)})` : id));
  const parts = [
    `> Logical ID **${issue.id}** · Milestone **${issue.milestone}** · ` +
      `Spec: [SPEC.md, ${ctx.specVersion} @ \`${ctx.sha.slice(0, 7)}\`](${blob}/docs/SPEC.md) · ` +
      `Backlog source: [ISSUES.md](${blob}/docs/ISSUES.md#${anchor(issue.title)}) · ` +
      `Branch: \`${issue.id}-<short-description>\``,
    '',
    text,
  ];
  const a = ctx.assets.get(issue.id);
  const shots = SCREENSHOT_REFS[issue.id];
  if (a || shots) parts.push('', '## Reference assets', '');
  for (const s of a?.sections ?? []) {
    parts.push(`### Flow — [SPEC section ${s}](${blob}/docs/SPEC.md)`, '', '```mermaid', ctx.mermaid.get(s)!.trimEnd(), '```', '');
  }
  for (const [label, path] of a?.mockups ?? []) {
    const src = ctx.readSource(path);
    parts.push(
      `### Mockup — ${label}`,
      '',
      `![${label}](${plantumlUrl(src)})`,
      '',
      `Editable source: [${path}](${blob}/docs/${path})`,
      '',
      '<details><summary>PlantUML source</summary>',
      '',
      '```plantuml',
      src.trimEnd(),
      '```',
      '',
      '</details>',
      '',
    );
  }
  if (shots) {
    parts.push('### Screenshot references', '');
    for (const r of shots) parts.push(`- ${r}: [${SCREENSHOTS[r]}](${blob}/docs/design-references/${SCREENSHOTS[r]})`);
  }
  return `${parts.join('\n').trimEnd()}\n`;
}

function sh(cmd: string, args: string[], input?: string): string {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] });
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });
  const dry = values['dry-run'];
  const issuesMd = readFileSync(resolve(ROOT, 'docs/ISSUES.md'), 'utf8');
  const spec = readFileSync(resolve(ROOT, 'docs/SPEC.md'), 'utf8');

  if (sh('git', ['status', '--porcelain', '--', 'docs']).trim()) {
    console.error('error: commit docs/ changes first; issue links are pinned to the current commit');
    process.exit(1);
  }
  const sha = sh('git', ['rev-parse', 'HEAD']).trim();
  if (!sh('git', ['branch', '-r', '--contains', sha]).trim()) {
    console.error(`error: push ${sha.slice(0, 7)} first; GitHub links must resolve`);
    process.exit(1);
  }

  const issues = parseIssues(issuesMd);
  const mapping = parseMapping(issuesMd);
  const ctx: BodyContext = {
    sha,
    specVersion: /Status: \*\*(Draft [\d.]+)/.exec(spec)?.[1] ?? 'current draft',
    mapping,
    assets: parseAssets(issuesMd),
    mermaid: parseMermaid(spec),
    readSource: (p) => readFileSync(resolve(ROOT, 'docs', p), 'utf8'),
  };

  const milestones = JSON.parse(sh('gh', ['api', `repos/${REPO}/milestones?state=all&per_page=100`])) as { title: string; number: number }[];
  for (const [title, description] of parsePhases(spec)) {
    const existing = milestones.find((m) => m.title === title);
    console.log(`${dry ? '[dry-run] ' : ''}milestone ${title}: ${existing ? 'update' : 'create'}`);
    if (dry) continue;
    if (existing) sh('gh', ['api', '-X', 'PATCH', `repos/${REPO}/milestones/${existing.number}`, '-f', `description=${description}`]);
    else sh('gh', ['api', '-X', 'POST', `repos/${REPO}/milestones`, '-f', `title=${title}`, '-f', `description=${description}`]);
  }

  const created: string[] = [];
  for (const issue of issues) {
    if (mapping.has(issue.id)) continue;
    console.log(`${dry ? '[dry-run] ' : ''}create ${issue.title}`);
    if (dry) continue;
    const url = sh('gh', ['issue', 'create', '-R', REPO, '--title', issue.title, '--milestone', issue.milestone, '--body', 'Body is being published from docs/ISSUES.md.']).trim();
    const number = Number(url.split('/').pop());
    mapping.set(issue.id, number);
    created.push(`| ${issue.id} | [#${number}](${url}) | ${issue.title.slice(7)} |`);
  }

  let failures = 0;
  for (const issue of issues) {
    const number = mapping.get(issue.id);
    if (number === undefined) continue;
    const body = issueBody(issue, ctx);
    if (body.length > 65000) {
      console.error(`error: ${issue.id} body is ${body.length} characters (GitHub limit 65536)`);
      failures++;
      continue;
    }
    console.log(`${dry ? '[dry-run] ' : ''}update #${number} ${issue.id} (${body.length} chars)`);
    if (dry) continue;
    sh('gh', ['issue', 'edit', String(number), '-R', REPO, '--title', issue.title, '--milestone', issue.milestone, '--body-file', '-'], body);
    const remote = JSON.parse(sh('gh', ['issue', 'view', String(number), '-R', REPO, '--json', 'title,body,milestone'])) as {
      title: string;
      body: string;
      milestone: { title: string } | null;
    };
    if (remote.title !== issue.title || remote.body.trim() !== body.trim() || remote.milestone?.title !== issue.milestone) {
      console.error(`error: #${number} ${issue.id} does not match after update`);
      failures++;
    }
  }

  if (created.length) {
    console.log('\nAdd these rows to the mapping table in docs/ISSUES.md, then commit, push and sync again:');
    for (const row of created) console.log(row);
  }
  if (failures) process.exit(1);
  console.log(dry ? '\ndry run complete; nothing was changed' : `\n${mapping.size} issues synchronized at ${sha.slice(0, 7)}`);
}
