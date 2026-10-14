import { z } from 'zod';
import { LocalizedTextSchema, NestedIdSchema } from '../src/schemas/artifactCommon.ts';
import type { Level } from '../src/schemas/common.ts';
import { examWordRange, READING_GENRES, READING_SKIM_SECONDS, READING_WORDS, ReadingDocumentSchema, readingItemSchema, type ReadingBrief } from '../src/schemas/reading.ts';
import type { OutlineContext } from '../src/validation/artifacts.ts';
import type { Section } from './contentPrompts.ts';

/**
 * Reading prompts (docs/reading-lessons.md), structured like the brief and content prompts of the
 * other kinds: one brief call (prompts.ts adds this category text), then one content section that
 * writes both documents and every question; content.ts assembles the steps, labels and page
 * durations locally. v1 were stand-alone Markdown prompts written outside this repository.
 */
export const READING_BRIEF_PROMPT_VERSION = 'reading-brief-v2';
export const READING_CONTENT_PROMPT_VERSION = 'reading-content-v2';

const LENGTHS = (Object.keys(READING_WORDS) as Level[]).map((level) => `${level} main ${READING_WORDS[level].join('–')}, exam ${examWordRange(level).join('–')}, skim ${READING_SKIM_SECONDS[level]} s`).join('; ');
const COUNTING = 'Words are counted like the validator: split the visible text (title, meta lines, headings, segment texts and values) on whitespace and count every token with at least one letter or digit ("l\'heure" and "15" are one word each; "€", "–" and "?" none).';

/** Category text of the reading brief call (appended to the shared brief prompt). */
export function readingBriefTask(ctx: OutlineContext): string {
  const level = ctx.level as Level;
  return `
This call plans a reading lesson ("prepare, then read"); a later call writes the documents and questions from this brief, so say everything it needs. Every reading lesson has five stages: keywords (4–6 key words of the text with their meaning, then a word–meaning matching), skim (the document with the key words highlighted blurs after skimSeconds; then one global question with focus genre, author or purpose), detail (3–4 questions on the open document), structure (one task) and exam (a second, shorter document of the same genre, 5 questions on 1–2 timed pages, no help).
The outline intent names a document genre and what the learner must find in it; build the lesson on both. genre is one of ${READING_GENRES.join(', ')}: a press release, report, review or editorial is an article; an email or a memo a letter; a timetable or event list a programme; a plea or a stage monologue a speech; a fable or verse a poem; use other only when nothing fits.
Keep in ${ctx.lang} only: title and every key word term (documents, questions and answers will be ${ctx.lang} too; translating them would give the answers away). situation, readerTask, coverageNotes, prerequisites, key word explanations, document contents and question focus are en/fr/de support maps. Key word translations give 1–6 short meanings per mother tongue; the first is the matching label and must differ between the key words in each locale.
Document lengths and skim time per level (${COUNTING}): ${LENGTHS}. At ${level}: documents.main.targetWords ${READING_WORDS[level].join('–')}, documents.exam.targetWords ${examWordRange(level).join('–')} (a different text of the same genre on facts the main one does not give), skimSeconds exactly ${READING_SKIM_SECONDS[level]}. partCount is the number of paragraphs, sections, clauses or bubbles.
Structure task: heading_matching (3 or more parts that show no heading; the learner matches one heading per part), order_parts (3 or more parts with a clear sequence, put back in order without the document) or order_information (texts without paragraphs: 3–6 pieces of information in the order the text sets, which must not simply be the order of its sentences).
Detail questions: 3–4 with unique ids, types reading_choice (3–4 options, one right), reading_true_false (from B1 it also offers "not stated"; never at A1–A2) or reading_short_answer (a 1–4 word fact). Plan facts the reader must actually find; from B2 at least one question needs inference.
Exam: 1–2 pages whose itemCount sums to exactly 5, types listing the question types of each page, timeLimitS about 1.5 × estimatedDurationS and never shorter.
Durations in seconds: keywords about 15 per key word plus 15; skim skimSeconds plus 15–30; detail the reading time of the main document plus about 25 per question (A1 about 150 for 4 questions); structure 45–120. estimatedMinutes must equal max(1, round((keywords + skim + detail + structure + every exam page estimate) / 60)).
`;
}

/* ----------------------------------------------------------------- content */

const QUESTION_TYPES = ['reading_choice', 'reading_true_false', 'reading_short_answer'];
const questionSchema = (withId: boolean) => {
  const options = readingItemSchema.options.filter((o) => QUESTION_TYPES.includes(o.shape.type.value)).map((o) => (withId ? o : (o as z.ZodObject).omit({ itemId: true })));
  return z.union(options as unknown as [z.ZodObject, z.ZodObject, z.ZodObject]);
};
const itemOf = (type: string) => readingItemSchema.options.find((o) => o.shape.type.value === type) as z.ZodObject;
const documentPayload = ReadingDocumentSchema.omit({ documentId: true, genre: true });

/** The task item of the brief's structure stage, without its itemId (assigned locally). */
function structureSchema(brief: ReadingBrief) {
  return brief.stages.structure.task === 'heading_matching' ? itemOf('reading_part_heading_matching').omit({ itemId: true }) : itemOf('reading_order').omit({ itemId: true });
}

/** One section writes the whole lesson: questions point at segments of the documents it writes. */
export const readingSections = (_lang: string, brief: ReadingBrief): Section[] => [{
  key: 'lesson',
  schema: z.strictObject({
    documents: z.strictObject({ main: documentPayload, exam: documentPayload }),
    keywordMatching: z.array(z.strictObject({ keywordId: NestedIdSchema, answerExplanation: LocalizedTextSchema })),
    skim: itemOf('reading_skim_choice').omit({ itemId: true, type: true, focus: true }),
    detail: z.array(questionSchema(true)),
    structure: z.strictObject({ instructions: LocalizedTextSchema, task: structureSchema(brief) }),
    exam: z.array(z.strictObject({ pageId: NestedIdSchema, items: z.array(questionSchema(false)) })),
  }),
  task: `Write the two documents and every question of the reading lesson.
documents.main and documents.exam are ${brief.genre} texts a native speaker would write in that genre and register, with exactly ${brief.documents.main.partCount} and ${brief.documents.exam.partCount} parts and about ${brief.documents.main.targetWords} and ${brief.documents.exam.targetWords} words (${COUNTING} Count before you answer; the level range is a hard limit). The exam document is a different text of the same genre on facts the main one does not give. A part is a paragraph, a menu section, a clause, a message bubble, a sign, a stanza; heading is a title shown in the document or null${brief.stages.structure.task === 'heading_matching' ? ' (null for every part of the main document: the learner matches the headings)' : ''}. Segments are the sentences, lines or verses of a part in reading order, one fact per segment where possible; value is a right-aligned value (price, quantity, time) or null. Segment and part IDs are unique across both documents (main m-s1, m-s2…; exam x-s1…). meta holds 0–4 short lines (sender and time, byline and date, parties). highlights (main document only; the exam document has []) marks every key word of the brief at least once with text copied verbatim from that segment (an inflected form is fine).
keywordMatching: one answerExplanation per key word of the brief, in its order.
skim: the global question with focus ${brief.stages.skim.focus} (${brief.stages.skim.focus === 'genre' ? 'what kind of document' : brief.stages.skim.focus === 'author' ? 'who writes it' : 'why it was written'}), answerable after a quick look, 3–4 options and answerOptionId.
detail: exactly the brief's questions in its order, itemId and type as planned: ${brief.stages.detail.questions.map((q) => `${q.id} (${q.type}: ${q.focus.en})`).join('; ')}. Evidence comes from the main document.
structure: instructions in en/fr/de naming what to do, and the ${brief.stages.structure.task} task: ${brief.stages.structure.task === 'heading_matching' ? 'one heading per part of the main document, every part paired once, headings all different' : brief.stages.structure.task === 'order_parts' ? 'mode parts, one piece per part (its first words or a summary) with its partId, acceptedOrders the document order' : 'mode information, 3–6 pieces with partId null in the order the text sets, which the order of its sentences must not give away'}; acceptedOrders hold 1–2 orders using every pieceId once.
exam: one entry per planned page in this order: ${brief.exam.pages.map((p) => `${p.pageId} = ${p.itemCount} questions of type ${p.types.join(' / ')}`).join('; ')}; evidence comes from the exam document.
Questions: options are 3–4 different texts with one right and the others plausible (taken from the text); reading_true_false has allowNotStated ${['B1', 'B2', 'C1', 'C2'].includes(brief.level) ? 'true; a not_stated statement is plausible and really absent from the text' : 'false and never the answer not_stated'}; reading_short_answer accepts 1–8 spellings a learner may type (15 h, 15h, 15 heures), the first being the model answer. evidenceSegmentIds lists the 1–4 segments that prove the answer ([] only for not_stated); they are marked after checking and quoted in the results. Documents, questions, options and accepted answers stay in ${brief.lang}; every answerExplanation says in en/fr/de why the answer is right, quoting the words of the text.`,
}];
