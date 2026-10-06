import { z } from 'zod';

import { LanguageSchema, LessonKindSchema, LevelSchema, ThemeSchema, TopicSchema } from './common.ts';

export const LESSON_ID_MAX = 64;
export const LESSON_TITLE_MAX = 80;
export const LESSON_INTENT_MAX = 200;

export const LessonIdSchema = z
  .string()
  .max(LESSON_ID_MAX)
  .regex(/^[a-z]{2}-[a-z]+(-[a-z]+)*$/, 'expected <lang>-<words>: lowercase letters and hyphens');

const OneLineTextSchema = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => s === s.trim(), 'must not start or end with whitespace')
    .refine((s) => !/[\p{Cc}​-‍﻿]/u.test(s), 'must not contain line breaks or invisible characters');

/** One entry of content/outlines/<lang>-<level>.json. */
export const OutlineEntrySchema = z
  .strictObject({
    id: LessonIdSchema,
    kind: LessonKindSchema,
    topic: TopicSchema.optional(),
    theme: ThemeSchema.optional(),
    workingTitle: OneLineTextSchema(LESSON_TITLE_MAX),
    intent: OneLineTextSchema(LESSON_INTENT_MAX),
  })
  .refine(
    (e) => (e.kind === 'grammar' ? e.topic != null && e.theme == null : e.theme != null && e.topic == null),
    { message: 'grammar needs a topic and no theme, other kinds a theme and no topic', path: ['kind'] },
  );
export type OutlineEntry = z.infer<typeof OutlineEntrySchema>;

export const OutlineFileSchema = z
  .strictObject({
    lang: LanguageSchema,
    level: LevelSchema,
    entries: z.array(OutlineEntrySchema).min(1),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.entries.forEach((entry, index) => {
      if (!entry.id.startsWith(`${file.lang}-`)) {
        ctx.addIssue({ code: 'custom', message: `id must start with ${file.lang}-`, path: ['entries', index, 'id'] });
      }
      if (seen.has(entry.id)) {
        ctx.addIssue({ code: 'custom', message: 'id used twice', path: ['entries', index, 'id'] });
      }
      seen.add(entry.id);
    });
  });
export type OutlineFile = z.infer<typeof OutlineFileSchema>;
