import { vocabularyContentSchema } from '../schemas/vocabulary.ts';
import { ContentReview } from './ContentReview.tsx';
import type { ArtifactViewProps } from './registry.ts';

export function VocabularyContentView({ data, brief }: ArtifactViewProps) {
  if (!brief || brief.kind !== 'vocabulary') return null;
  return <ContentReview content={vocabularyContentSchema(brief.lang).parse(data)} brief={brief} />;
}
