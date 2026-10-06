import { z } from 'zod';

import { LanguageSchema, LevelSchema } from './common.ts';
import { LessonIdSchema } from './outline.ts';

export const MANIFEST_SCHEMA_VERSION = 1;

export const CourseSchema = z.strictObject({
  key: z.string().min(1),
  lang: LanguageSchema,
  level: LevelSchema,
  /** Relative to the app's index.html, e.g. content/outlines/fr-a1.json. */
  outlineUrl: z.string().min(1),
  sourceHash: z.string().min(1),
  lessonIds: z.array(LessonIdSchema),
});
export type Course = z.infer<typeof CourseSchema>;

/** Availability of one generated file. Schema validity is checked when the file is loaded. */
export const ArtifactFileSchema = z.strictObject({
  url: z.string().min(1),
  sourceHash: z.string().min(1),
  /**
   * `valid`: matches its schema and cross-reference rules and was generated
   * from the current inputs; `stale`: valid but generated from an older
   * outline entry or brief; `invalid`: fails validation; `malformed`: not JSON.
   */
  status: z.enum(['valid', 'invalid', 'stale', 'malformed']),
});
export type ArtifactFile = z.infer<typeof ArtifactFileSchema>;

export const LessonArtifactsSchema = z.strictObject({
  /** Per-entry canonical outline hash (entry plus course lang/level). */
  outlineHash: z.string().min(1),
  draft: ArtifactFileSchema.optional(),
  content: ArtifactFileSchema.optional(),
});
export type LessonArtifacts = z.infer<typeof LessonArtifactsSchema>;

export const ManifestSchema = z.strictObject({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  courses: z.array(CourseSchema),
  artifacts: z.record(LessonIdSchema, LessonArtifactsSchema),
});
export type Manifest = z.infer<typeof ManifestSchema>;
