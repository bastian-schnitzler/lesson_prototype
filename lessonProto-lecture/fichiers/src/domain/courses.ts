import { compareLevels, LESSON_KINDS, type LessonKind, type Level } from '../schemas/common.ts';
import type { Course, LessonArtifacts, Manifest } from '../schemas/manifest.ts';
import type { OutlineEntry } from '../schemas/outline.ts';
import { hasContentFile } from '../schemas/artifacts.ts';

export interface CourseSelection {
  lang: string;
  level: Level;
}

export const PREFERRED_LANGUAGE = 'fr';
export const PREFERRED_LEVEL: Level = 'A1';

export function catalogLanguages(manifest: Manifest): string[] {
  return [...new Set(manifest.courses.map((c) => c.lang))].sort();
}

export function levelsFor(manifest: Manifest, lang: string): Level[] {
  return manifest.courses
    .filter((c) => c.lang === lang)
    .map((c) => c.level)
    .sort(compareLevels);
}

function defaultLevel(levels: Level[], keep?: Level): Level | undefined {
  if (keep && levels.includes(keep)) return keep;
  if (levels.includes(PREFERRED_LEVEL)) return PREFERRED_LEVEL;
  return levels[0];
}

/** fr/A1 when available; otherwise the first language and its A1 or lowest level. */
export function initialSelection(manifest: Manifest): CourseSelection | undefined {
  const langs = catalogLanguages(manifest);
  const lang = langs.includes(PREFERRED_LANGUAGE) ? PREFERRED_LANGUAGE : langs[0];
  if (!lang) return undefined;
  const level = defaultLevel(levelsFor(manifest, lang));
  return level ? { lang, level } : undefined;
}

/** Keeps the current level only when the new language offers it. */
export function selectLanguage(manifest: Manifest, current: CourseSelection, lang: string): CourseSelection | undefined {
  const level = defaultLevel(levelsFor(manifest, lang), current.level);
  return level ? { lang, level } : undefined;
}

export function findCourse(manifest: Manifest, selection: CourseSelection): Course | undefined {
  return manifest.courses.find((c) => c.lang === selection.lang && c.level === selection.level);
}

export function courseOfLesson(manifest: Manifest, id: string): Course | undefined {
  return manifest.courses.find((c) => c.lessonIds.includes(id));
}

export interface IndexRow {
  /** 1-based position in the outline file; stable under filtering. */
  ordinal: number;
  entry: OutlineEntry;
}

export function filterRows(entries: OutlineEntry[], categories: ReadonlySet<LessonKind>): IndexRow[] {
  return entries
    .map((entry, i) => ({ ordinal: i + 1, entry }))
    .filter((row) => categories.has(row.entry.kind));
}

export const ALL_CATEGORIES: ReadonlySet<LessonKind> = new Set(LESSON_KINDS);

export type ArtifactLabel = 'outline' | 'draft' | 'content';

export type ArtifactProblem = 'malformed' | 'invalid' | 'stale';

export interface ArtifactState {
  /** Highest artifact present, even when it needs review. */
  label: ArtifactLabel;
  incomplete: boolean;
  /** Worst problem of a present file, if any. */
  problem: ArtifactProblem | null;
}

const PROBLEM_ORDER: ArtifactProblem[] = ['malformed', 'invalid', 'stale'];

export function artifactState(artifacts: LessonArtifacts | undefined): ArtifactState {
  const draft = artifacts?.draft;
  const content = artifacts?.content;
  return {
    label: content ? 'content' : draft ? 'draft' : 'outline',
    incomplete: Boolean(content && !draft),
    problem: PROBLEM_ORDER.find((p) => draft?.status === p || content?.status === p) ?? null,
  };
}

/**
 * Categories whose renderers are implemented: P1-09 baseline renderers cover every
 * vocabulary and grammar item type (phases 2/3 refine them), reading has its own
 * (docs/reading-lessons.md); functions waits for phase 4.
 */
export const PLAYABLE_KINDS: ReadonlySet<LessonKind> = new Set<LessonKind>(['vocabulary', 'grammar', 'reading']);

export type NotReadyReason = 'missingDraft' | 'missingContent' | ArtifactProblem | 'unsupported';

/** Why Start lesson is unavailable; empty when all required artifacts are valid, current and playable. */
export function readiness(kind: LessonKind, artifacts: LessonArtifacts | undefined, playable = PLAYABLE_KINDS): NotReadyReason[] {
  const reasons: NotReadyReason[] = [];
  if (!artifacts?.draft) reasons.push('missingDraft');
  // Vocabulary lessons consist of the brief only (P2-04).
  if (hasContentFile(kind) && !artifacts?.content) reasons.push('missingContent');
  for (const p of PROBLEM_ORDER) if (artifacts?.draft?.status === p || artifacts?.content?.status === p) reasons.push(p);
  if (!playable.has(kind)) reasons.push('unsupported');
  return reasons;
}
