import menu from '../../../authoring/reading/fr-reading-a-restaurant-menu.ts';
import type { ReadingDefinition } from '../../../scripts/author-reading-items.ts';

/** Fixture reading lesson for the end-to-end tests: the A1 menu lesson under the fixture outline entry fr-fix-menu. */
export default { ...menu, id: 'fr-fix-menu' } satisfies ReadingDefinition;
