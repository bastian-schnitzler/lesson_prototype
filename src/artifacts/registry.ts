import type { ComponentType } from 'react';

import type { LessonKind } from '../schemas/common.ts';
import { GrammarBriefView } from './GrammarBriefView.tsx';
import { VocabularyBriefView } from './VocabularyBriefView.tsx';

/**
 * Category-specific Draft and Content views, keyed by the artifact's lesson
 * kind. P1-06 registered the Draft views; P1-08 adds the Content views;
 * functions/reading wait for their phase 4/5 schemas. A kind
 * without a view shows a short message and the Raw JSON toggle instead.
 */
export interface ArtifactViewProps {
  data: unknown;
}

export const draftViews: Partial<Record<LessonKind, ComponentType<ArtifactViewProps>>> = {
  vocabulary: VocabularyBriefView,
  grammar: GrammarBriefView,
};
export const contentViews: Partial<Record<LessonKind, ComponentType<ArtifactViewProps>>> = {};
