import type { ComponentType } from 'react';

import type { LessonKind } from '../schemas/common.ts';

/**
 * Category-specific Draft and Content views, keyed by the artifact's lesson
 * kind. P1-06 registers VocabularyBriefView/GrammarBriefView and P1-08 the
 * Content views; functions/reading wait for their phase 4/5 schemas. A kind
 * without a view shows a short message and the Raw JSON toggle instead.
 */
export interface ArtifactViewProps {
  data: unknown;
}

export const draftViews: Partial<Record<LessonKind, ComponentType<ArtifactViewProps>>> = {};
export const contentViews: Partial<Record<LessonKind, ComponentType<ArtifactViewProps>>> = {};
