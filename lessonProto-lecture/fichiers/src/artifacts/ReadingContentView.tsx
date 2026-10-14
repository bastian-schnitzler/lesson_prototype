import { useI18n } from '../app/context.tsx';
import { ReadingDocument } from '../components/ReadingDocument.tsx';
import { documentWords, readingContentSchema } from '../schemas/reading.ts';
import { ContentReview } from './ContentReview.tsx';
import type { ArtifactViewProps } from './registry.ts';

/** Content view of a reading lesson: both documents as the learner sees them, then the page-by-page review. */
export function ReadingContentView({ data, brief }: ArtifactViewProps) {
  const { t } = useI18n();
  if (!brief || brief.kind !== 'reading') return null;
  const content = readingContentSchema(brief.lang).parse(data);
  return (
    <>
      <div className="reading-review-documents">
        {content.documents.map((doc) => (
          <section key={doc.documentId} className="brief-block">
            <h3>{t(doc.documentId === 'main' ? 'reading.documentMain' : 'reading.documentExam')} <small className="muted">{t('reading.words', { count: documentWords(doc) })}</small></h3>
            <ReadingDocument doc={doc} lang={content.lang} highlightKeywords={doc.documentId === 'main'} />
          </section>
        ))}
      </div>
      <ContentReview content={content} brief={brief} />
    </>
  );
}
