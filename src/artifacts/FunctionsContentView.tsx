import { functionsContentSchema } from '../schemas/functions.ts';
import { ContentReview } from './ContentReview.tsx';
import type { ArtifactViewProps } from './registry.ts';

export function FunctionsContentView({ data, brief }: ArtifactViewProps) {
  if (!brief || brief.kind !== 'functions') return null;
  return <ContentReview content={functionsContentSchema(brief.lang).parse(data)} brief={brief} />;
}
