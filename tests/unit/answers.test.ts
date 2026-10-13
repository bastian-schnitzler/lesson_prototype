import { describe, expect, it } from 'vitest';

import { answerMarks, classifyAnswer, normalizeAnswer } from '../../src/domain/answers.ts';

const accepted = (answers: string[], accentSensitive: string[] = []) => ({ answers, accentSensitive });

describe('free-text answer classification', () => {
  it('distinguishes full, accent/case-only, incorrect and unanswered (SPEC examples)', () => {
    const a = accepted(['un café']);
    expect(classifyAnswer('un café', a)).toMatchObject({ outcome: 'fully_correct', credit: 1 });
    expect(classifyAnswer('un cafe', a)).toMatchObject({ outcome: 'orthography_only', credit: 0.5 });
    expect(classifyAnswer('Un café', a)).toMatchObject({ outcome: 'orthography_only', credit: 0.5 });
    expect(classifyAnswer('une café', a)).toMatchObject({ outcome: 'incorrect', credit: 0 });
    expect(classifyAnswer('   ', a)).toMatchObject({ outcome: 'unanswered', credit: 0 });
  });

  it('keeps the original response and reports the expected answer', () => {
    expect(classifyAnswer(' un  cafe ', accepted(['un café']))).toEqual({ outcome: 'orthography_only', credit: 0.5, response: ' un  cafe ', expected: 'un café' });
  });

  it('normalizes whitespace, no-break spaces and typographic apostrophes but not accents or case', () => {
    expect(normalizeAnswer('  Ça va ?  ')).toBe('Ça va ?');
    expect(classifyAnswer('l’école', accepted(["l'école"])).outcome).toBe('fully_correct');
    expect(classifyAnswer('Ça va ?', accepted(['Ça va ?'])).outcome).toBe('fully_correct');
  });

  it('accepts any declared variant', () => {
    expect(classifyAnswer('un stylo', accepted(['un crayon', 'un stylo'])).outcome).toBe('fully_correct');
  });

  it('gives half credit for ligature and umlaut substitutes (D40)', () => {
    expect(classifyAnswer('la soeur', accepted(['la sœur'])).outcome).toBe('orthography_only');
    expect(classifyAnswer('ex aequo', accepted(['ex æquo'])).outcome).toBe('orthography_only');
    expect(classifyAnswer('das Maedchen', accepted(['das Mädchen'])).outcome).toBe('orthography_only');
    expect(classifyAnswer('das Madchen', accepted(['das Mädchen'])).outcome).toBe('orthography_only');
    expect(classifyAnswer('schoen', accepted(['schön'])).outcome).toBe('orthography_only');
    expect(classifyAnswer('fur', accepted(['für'])).outcome).toBe('orthography_only');
  });

  it('treats accent errors on accent-sensitive words as incorrect (D40)', () => {
    const a = accepted(['Il va à Paris.'], ['à']);
    expect(classifyAnswer('Il va a Paris.', a).outcome).toBe('incorrect');
    expect(classifyAnswer('il va à paris.', a).outcome).toBe('orthography_only');
    const ou = accepted(['où'], ['où']);
    expect(classifyAnswer('ou', ou).outcome).toBe('incorrect');
    const a2 = accepted(['Il a un chat.'], ['a']);
    expect(classifyAnswer('Il à un chat.', a2).outcome).toBe('incorrect');
  });

  it('does not give accent credit to different letters', () => {
    expect(classifyAnswer('livres', accepted(['livre'])).outcome).toBe('incorrect');
    expect(classifyAnswer('grand mère', accepted(['grand-mère'])).outcome).toBe('incorrect');
  });
});

describe('answer marks in results (P4-05 review)', () => {
  it('marks only the letters whose accent or capital differs', () => {
    expect(answerMarks('un cafe', ['un café'])).toEqual([{ text: 'un caf', wrong: false }, { text: 'e', wrong: true }]);
    expect(answerMarks('Un café', ['un café'])).toEqual([{ text: 'U', wrong: true }, { text: 'n café', wrong: false }]);
  });
  it('marks only a wrong article', () => {
    expect(answerMarks('une café', ['un café'])).toEqual([{ text: 'une', wrong: true }, { text: ' café', wrong: false }]);
    expect(answerMarks('le livre', ['un livre'])).toEqual([{ text: 'le', wrong: true }, { text: ' livre', wrong: false }]);
  });
  it('keeps the learner’s own apostrophes', () => {
    expect(answerMarks('L’addition, s’il vous plait', ['L’addition, s’il vous plaît']).map((m) => m.text).join('')).toBe('L’addition, s’il vous plait');
  });
  it('marks the whole answer otherwise', () => {
    expect(answerMarks('un thé', ['un café'])).toEqual([{ text: 'un thé', wrong: true }]);
    expect(answerMarks('café', ['un café'])).toEqual([{ text: 'café', wrong: true }]);
  });
});
