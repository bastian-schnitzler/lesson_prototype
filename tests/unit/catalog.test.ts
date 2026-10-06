import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalJson, scanCatalog, type SourceFile } from '../../src/catalog/scan.ts';
import { scanContentDir, sha256 } from '../../scripts/catalog.ts';
import { FIXTURE_CONTENT } from '../helpers.ts';

const entry = (id: string, kind = 'grammar') =>
  kind === 'grammar'
    ? { id, kind, topic: 'pronouns', workingTitle: `Title ${id}`, intent: 'Intent.' }
    : { id, kind, theme: 'education', workingTitle: `Title ${id}`, intent: 'Intent.' };

const outline = (name: string, lang: string, level: string, entries: unknown[]): SourceFile => ({
  name,
  text: JSON.stringify({ lang, level, entries }),
});

const scan = (outlines: SourceFile[], briefs: SourceFile[] = [], lessons: SourceFile[] = []) =>
  scanCatalog({ outlines, briefs, lessons, hash: sha256 });

describe('scanCatalog', () => {
  it('derives an ordered course catalog from every outline file', () => {
    const r = scan([
      outline('fr-b1.json', 'fr', 'B1', [entry('fr-b')]),
      outline('de-a1.json', 'de', 'A1', [entry('de-a')]),
      outline('fr-a1.json', 'fr', 'A1', [entry('fr-a'), entry('fr-c', 'vocabulary')]),
    ]);
    expect(r.errors).toEqual([]);
    expect(r.manifest.courses.map((c) => c.key)).toEqual(['de-a1', 'fr-a1', 'fr-b1']);
    expect(r.manifest.courses[1]).toMatchObject({ outlineUrl: 'content/outlines/fr-a1.json', lessonIds: ['fr-a', 'fr-c'] });
  });

  it('rejects invalid outlines, duplicate courses and globally duplicated lesson IDs', () => {
    const r = scan([
      outline('fr-a1.json', 'fr', 'A1', [entry('fr-a')]),
      outline('fr-a2.json', 'fr', 'A2', [entry('fr-a')]),
      outline('de-a1.json', 'de', 'A1', [{ ...entry('de-x'), theme: 'education' }]),
      { name: 'xx-a1.json', text: '{ not json' },
      outline('fr-x.json', 'fr', 'B2', [entry('fr-z')]),
    ]);
    expect(r.manifest.courses.map((c) => c.key)).toEqual(['fr-a1']);
    expect(r.errors.join('\n')).toMatch(/fr-a2.json: lesson ID fr-a is already used/);
    expect(r.errors.join('\n')).toMatch(/de-a1.json: invalid outline/);
    expect(r.errors.join('\n')).toMatch(/xx-a1.json: not valid JSON/);
    expect(r.errors.join('\n')).toMatch(/fr-x.json: expected file name fr-b2.json/);
  });

  it('attaches draft and content availability and flags malformed or orphaned files', () => {
    const r = scan(
      [outline('fr-a1.json', 'fr', 'A1', [entry('fr-a'), entry('fr-b')])],
      [{ name: 'fr-a.json', text: '{}' }, { name: 'fr-b.json', text: '{oops' }, { name: 'fr-zzz.json', text: '{}' }],
      [{ name: 'fr-a.json', text: '{}' }],
    );
    expect(r.manifest.artifacts['fr-a'].draft).toMatchObject({ url: 'content/briefs/fr-a.json', status: 'invalid' });
    expect(r.manifest.artifacts['fr-a'].content).toMatchObject({ url: 'content/lessons/fr-a.json', status: 'invalid' });
    expect(r.manifest.artifacts['fr-b'].draft?.status).toBe('malformed');
    expect(r.warnings.join('\n')).toMatch(/fr-zzz.json: no outline entry/);
  });

  it('hashes each lesson from its own entry, so editing another entry keeps it current', () => {
    const before = scan([outline('fr-a1.json', 'fr', 'A1', [entry('fr-a'), entry('fr-b')])]);
    const after = scan([outline('fr-a1.json', 'fr', 'A1', [entry('fr-a'), { ...entry('fr-b'), intent: 'Changed.' }])]);
    expect(after.manifest.artifacts['fr-a'].outlineHash).toBe(before.manifest.artifacts['fr-a'].outlineHash);
    expect(after.manifest.artifacts['fr-b'].outlineHash).not.toBe(before.manifest.artifacts['fr-b'].outlineHash);
  });

  it('validates fixture artifacts and marks them stale when their outline entry changes', () => {
    const fixtures = scanContentDir(FIXTURE_CONTENT).manifest.artifacts;
    for (const id of ['fr-classroom-objects', 'fr-classroom-instructions', 'fr-verb-etre-present', 'fr-negation-ne-pas']) {
      expect(fixtures[id].draft?.status, id).toBe('valid');
      expect(fixtures[id].content?.status, id).toBe('valid');
    }
    expect(fixtures['fr-fix-pronouns'].content?.status).toBe('invalid');

    const read = (p: string) => readFileSync(join(FIXTURE_CONTENT, p), 'utf8');
    const outlineText = read('outlines/fr-a1.json').replace("Nommer une douzaine d'objets", "Nommer dix objets");
    const r = scanCatalog({
      outlines: [{ name: 'fr-a1.json', text: outlineText }],
      briefs: [{ name: 'fr-classroom-objects.json', text: read('briefs/fr-classroom-objects.json') }],
      lessons: [{ name: 'fr-classroom-objects.json', text: read('lessons/fr-classroom-objects.json') }],
      hash: sha256,
    });
    expect(r.manifest.artifacts['fr-classroom-objects'].draft?.status).toBe('stale');
    expect(r.manifest.artifacts['fr-classroom-objects'].content?.status).toBe('stale');
  });

  it('canonicalizes JSON with sorted keys', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: null, c: 'x' }] })).toBe('{"a":[2,{"c":"x","d":null}],"b":1}');
  });

  it('accepts the repository outline and the test fixtures', () => {
    const repo = scanContentDir();
    expect(repo.errors).toEqual([]);
    const frA1 = repo.manifest.courses.find((c) => c.key === 'fr-a1');
    expect(frA1?.lessonIds).toHaveLength(120);
    expect(scanContentDir(FIXTURE_CONTENT).errors).toEqual([]);
  });
});
