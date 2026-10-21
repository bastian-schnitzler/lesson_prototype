import { useI18n } from '../app/context.tsx';
import { ReadingDocument } from '../components/ReadingDocument.tsx';
import { documentWords } from '../domain/readingLesson.ts';
import { readingContentSchema } from '../schemas/reading.ts';
import { ContentReview } from './ContentReview.tsx';
import type { ArtifactViewProps } from './registry.ts';

const COPY = {
  en: { main: 'Main document', exam: 'Exam document', words: '{n} words' },
  fr: { main: 'Document principal', exam: 'Document d’examen', words: '{n} mots' },
  de: { main: 'Hauptdokument', exam: 'Prüfungsdokument', words: '{n} Wörter' },
};

/** Content view of a reading lesson: both documents as the learner sees them, then the shared page review. */
export function ReadingContentView({ data, brief }: ArtifactViewProps) {
  const { locale } = useI18n();
  if (!brief || brief.kind !== 'reading') return null;
  const content = readingContentSchema(brief.lang).parse(data);
  const copy = COPY[locale];
  return (
    <>
      <div className="brief-columns">
        {content.documents.map((doc) => (
          <section key={doc.documentId} className="brief-block">
            <h3>{copy[doc.documentId]} <small className="muted">{copy.words.replace('{n}', String(documentWords(doc)))}</small></h3>
            <ReadingDocument doc={doc} lang={content.lang} label={copy[doc.documentId]} highlight={doc.documentId === 'main'} />
          </section>
        ))}
      </div>
      <ContentReview content={content} brief={brief} />
    </>
  );
}
