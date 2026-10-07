import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { vocabularyLesson } from '../../src/domain/vocabularyLesson.ts';
import type { VocabularyBrief } from '../../src/schemas/vocabulary.ts';

/**
 * The renderable lesson of a fixture or sample: vocabulary lessons are derived from the brief
 * (P2-04, there is no content file); other kinds read content/lessons/<id>.json.
 */
export function lessonOf(contentDir: string, id: string) {
  const brief = JSON.parse(readFileSync(join(contentDir, 'briefs', `${id}.json`), 'utf8'));
  return brief.kind === 'vocabulary' ? vocabularyLesson(brief as VocabularyBrief) : JSON.parse(readFileSync(join(contentDir, 'lessons', `${id}.json`), 'utf8'));
}
