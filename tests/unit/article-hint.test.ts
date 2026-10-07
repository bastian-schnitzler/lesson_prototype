// @vitest-environment node
import { expect, it } from 'vitest';
import { missingArticle, startsWithArticle } from '../../src/domain/articleHint.ts';

it('detects French articles, including elided l\'', () => {
  expect(startsWithArticle('un livre', 'fr')).toBe(true);
  expect(startsWithArticle("l'Espagne", 'fr')).toBe(true);
  expect(startsWithArticle('lundi', 'fr')).toBe(false);
  expect(startsWithArticle('un livre', 'de')).toBe(false); // no article rule for other languages yet
});

it.each([
  ['livre', 'un livre', true],
  ['Livre', 'une table', true],
  ['date de naissance', 'une date de naissance', true],
  ['Espagne', "l'Espagne", true],
  ['un livre', 'un livre', false],
  ['le livre', 'un livre', false], // has an article: graded, not hinted
  ['grand livre rouge', 'un livre', false], // word count does not match
  ['lundi', 'lundi', false], // the solution has no article
  ['', 'un livre', false],
])('missingArticle(%j, %j) is %s', (response, solution, expected) => {
  expect(missingArticle(response, solution, 'fr')).toBe(expected);
});
