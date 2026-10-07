import type { ComponentType } from 'react';

import type { LessonKind } from '../schemas/common.ts';
import { GrammarBriefView } from './GrammarBriefView.tsx';
import { VocabularyBriefView } from './VocabularyBriefView.tsx';
import { GrammarContentView } from './GrammarContentView.tsx';
import type { Brief } from '../schemas/artifacts.ts';

/**
 * Category-specific Draft and Content views, keyed by the artifact's lesson
 * kind. P1-06 registered the Draft views; P1-08 adds the Content views;
 * functions/reading wait for their phase 4/5 schemas. A kind
 * without a view shows a short message and the Raw JSON toggle instead.
 */
export interface ArtifactViewProps {
  data: unknown;
  brief?: Brief;
}

export const draftViews: Partial<Record<LessonKind, ComponentType<ArtifactViewProps>>> = {
  vocabulary: VocabularyBriefView,
  grammar: GrammarBriefView,
};
/** Vocabulary has no content file (P2-04); its Draft view includes the derived lesson preview. */
export const contentViews: Partial<Record<LessonKind, ComponentType<ArtifactViewProps>>> = {
  grammar: GrammarContentView,
};
