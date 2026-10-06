import { grammarContentSchema } from '../schemas/grammar.ts';
import { ContentReview } from './ContentReview.tsx';
import type { ArtifactViewProps } from './registry.ts';

export function GrammarContentView({ data, brief }: ArtifactViewProps) {
  if (!brief || brief.kind !== 'grammar') return null;
  return <ContentReview content={grammarContentSchema(brief.lang).parse(data)} brief={brief} />;
}
