import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/app/App.tsx';
import { clearOutlineCache } from '../../src/data/load.ts';
import { PREFERENCES_KEY } from '../../src/domain/preferences.ts';
import { mockContentFetch } from '../helpers.ts';

function go(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

async function renderIndex() {
  render(<App />);
  return screen.findByRole('table');
}

const rowIds = (table: HTMLElement) => within(table).getAllByRole('row').slice(1).map((r) => r.getAttribute('data-lesson-id'));
const ordinals = (table: HTMLElement) => within(table).getAllByRole('row').slice(1).map((r) => r.querySelector('.ordinal')?.textContent);

beforeEach(() => {
  localStorage.clear();
  clearOutlineCache();
  mockContentFetch();
  window.location.hash = '#/';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('lesson index', () => {
  it('lists the fr/A1 course in outline order with one state-labeled Content button and no Start', async () => {
    const table = await renderIndex();
    expect(screen.getByRole('heading', { level: 1, name: 'Your lessons' })).toBeInTheDocument();
    expect(ordinals(table)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
    const labels = within(table).getAllByRole('row').slice(1).map((r) => within(r).getByRole('link').textContent);
    expect(labels).toEqual(['Outline', 'Content ⚠', 'Content', 'Content', 'Draft ⚠', 'Outline', 'Content', 'Content']);
    expect(within(table).getAllByRole('link')[0]).toHaveAttribute('href', '#/lesson/fr-fix-greetings');
    expect(screen.queryByRole('link', { name: 'Start lesson' })).toBeNull();
    expect(within(screen.getByRole('radiogroup', { name: 'Learning language' })).getByRole('radio', { name: 'fr', checked: true })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'A1', checked: true })).toBeInTheDocument();
  });

  it('filters categories without changing ordinals and offers a reset when none is selected', async () => {
    const user = userEvent.setup();
    const table = await renderIndex();
    await user.click(screen.getByRole('checkbox', { name: 'Grammar' }));
    expect(ordinals(table)).toEqual(['01', '03', '05', '06', '07']);
    for (const name of ['Voc', 'Func', 'Reading']) await user.click(screen.getByRole('checkbox', { name }));
    expect(screen.getByText('No categories are selected.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Show all categories' }));
    expect(rowIds(await screen.findByRole('table'))).toHaveLength(8);
  });

  it('switches language and level from the catalog and keeps category selection', async () => {
    const user = userEvent.setup();
    await renderIndex();
    await user.click(screen.getByRole('checkbox', { name: 'Reading' }));
    await user.click(screen.getByRole('radio', { name: 'B1' }));
    await waitFor(() => expect(rowIds(screen.getByRole('table'))).toEqual(['fr-fix-subjunctive', 'fr-fix-travel']));
    await user.click(within(screen.getByRole('radiogroup', { name: 'Learning language' })).getByRole('radio', { name: 'de' }));
    await waitFor(() => expect(rowIds(screen.getByRole('table'))).toEqual(['de-fix-perfekt', 'de-fix-wohnung']));
    expect(screen.getByRole('radio', { name: 'A2', checked: true })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'A1' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Reading' })).not.toBeChecked();
  });

  it('disables the mother tongue equal to the course language and replaces a stored one', async () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ motherTongue: 'fr', interfaceLanguage: 'en' }));
    await renderIndex();
    const group = screen.getByRole('group', { name: 'Mother tongue' });
    expect(within(group).getByRole('radio', { name: 'fr' })).toBeDisabled();
    expect(within(group).getByRole('radio', { name: 'en' })).toBeChecked();
    expect(screen.getByText(/Mother tongue changed to English/)).toBeInTheDocument();
  });

  it('persists preferences but never the last-try scores', async () => {
    const user = userEvent.setup();
    await renderIndex();
    await user.click(within(screen.getByRole('group', { name: 'Mother tongue' })).getByRole('radio', { name: 'de' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Interface language' }), 'de');
    expect(await screen.findByRole('heading', { level: 1, name: 'Deine Lektionen' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual({ motherTongue: 'de', interfaceLanguage: 'de' });
    expect(Object.keys(localStorage)).toEqual([PREFERENCES_KEY]);
    expect(document.documentElement.lang).toBe('de');
  });

  it('ignores a late outline response for a course that is no longer selected', async () => {
    const user = userEvent.setup();
    const real = mockContentFetch();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith('fr-b1.json')) await gate;
        return real(input);
      }),
    );
    await renderIndex();
    await user.click(screen.getByRole('radio', { name: 'B1' }));
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'A1' }));
    await waitFor(() => expect(rowIds(screen.getByRole('table'))).toHaveLength(8));
    await act(async () => release());
    expect(rowIds(screen.getByRole('table'))[0]).toBe('fr-fix-greetings');
  });

  it('shows a catalog error with retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"schemaVersion":2}', { status: 200 })));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('The course catalog could not be read');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('lesson artifact page', () => {
  it('shows the shared Outline card, valid artifacts and a read-only mother tongue', async () => {
    await renderIndex();
    go('#/lesson/fr-classroom-objects');
    expect(await screen.findByRole('heading', { level: 1, name: 'Les objets de la classe' })).toBeInTheDocument();
    expect(screen.getByText('Lesson 3')).toBeInTheDocument();
    expect(screen.getByText(/Nommer une douzaine d'objets de la classe/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/A structured view for this file is not available yet/)).toHaveLength(2));
    expect(screen.getByText(/Start lesson is unavailable/)).toBeInTheDocument();
    expect(screen.getByText('Lessons of this category cannot be played yet.')).toBeInTheDocument();
    expect(screen.queryByText('The draft is missing.')).toBeNull();
    for (const radio of within(screen.getByRole('group', { name: 'Mother tongue' })).getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Interface language' })).toBeEnabled();
    expect(screen.queryByRole('link', { name: 'Start lesson' })).toBeNull();
  });

  it('toggles a raw JSON tree with default expansion and keeps user expansion across mode and locale switches', async () => {
    const user = userEvent.setup();
    await renderIndex();
    go('#/lesson/fr-classroom-objects');
    await waitFor(() => expect(screen.getAllByText(/A structured view for this file/)).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    const tree = screen.getByRole('tree');
    const item = (name: RegExp) => within(tree).getByRole('treeitem', { name });
    expect(item(/^Combined artifact object/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^outline/)).toHaveAttribute('aria-expanded', 'false');
    expect(item(/^draft/)).toHaveAttribute('aria-expanded', 'false');
    expect(item(/^content/)).toHaveAttribute('aria-expanded', 'false');

    await user.click(item(/^draft/));
    expect(item(/^objective/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^targets/)).toHaveAttribute('aria-expanded', 'false');
    expect(item(/^targetCount: 4/)).not.toHaveAttribute('aria-expanded');
    expect(item(/^prerequisites: \[\]/)).toBeInTheDocument();
    await user.click(item(/^plan/));
    expect(item(/^listening/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^required: false/)).toBeInTheDocument();
    expect(item(/^estimatedDurationS: null/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Structured view' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Interface language' }), 'fr');
    await user.click(screen.getByRole('button', { name: 'JSON brut' }));
    expect(within(screen.getByRole('tree')).getByRole('treeitem', { name: /^draft/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports keyboard navigation in the tree', async () => {
    const user = userEvent.setup();
    await renderIndex();
    go('#/lesson/fr-classroom-objects');
    await waitFor(() => expect(screen.getAllByText(/A structured view for this file/)).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    const tree = screen.getByRole('tree');
    within(tree).getByRole('treeitem', { name: /^Combined artifact object/ }).focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toHaveAccessibleName(/^draft/);
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toHaveAccessibleName(/^Combined artifact object/);
  });

  it('shows malformed files as diagnostics with their unchanged text', async () => {
    const user = userEvent.setup();
    await renderIndex();
    go('#/lesson/fr-fix-numbers');
    expect(await screen.findByText(/This file is not valid JSON/)).toBeInTheDocument();
    expect(screen.getAllByText(/"id": "fr-fix-numbers",/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    expect(screen.getByText(/Draft is not valid JSON/)).toBeInTheDocument();
    expect(within(screen.getByRole('tree')).queryByRole('treeitem', { name: /^draft/ })).toBeNull();
  });

  it('lists contract problems of invalid files', async () => {
    const user = userEvent.setup();
    await renderIndex();
    go('#/lesson/fr-fix-pronouns');
    expect(await screen.findByText('This file does not match the lesson contract:')).toBeInTheDocument();
    expect(screen.getByText('No draft has been generated for this lesson yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Raw JSON' }));
    expect(within(screen.getByRole('tree')).getByRole('treeitem', { name: /^content/ })).toBeInTheDocument();
    expect(screen.getByText('This file does not match the lesson contract:')).toBeInTheDocument();
  });

  it('explains pending categories and returns to the lesson course', async () => {
    const user = userEvent.setup();
    await renderIndex();
    go('#/lesson/fr-fix-menu');
    expect(await screen.findByText(/Requirements for Reading lessons are still being defined/)).toBeInTheDocument();
    go('#/lesson/de-fix-wohnung');
    await screen.findByRole('heading', { level: 1, name: 'Die Wohnung' });
    await user.click(screen.getByRole('link', { name: 'Lesson overview' }));
    await waitFor(() => expect(rowIds(screen.getByRole('table'))).toEqual(['de-fix-perfekt', 'de-fix-wohnung']));
  });

  it('reports unknown lessons', async () => {
    await renderIndex();
    go('#/lesson/fr-does-not-exist');
    expect(await screen.findByText('Lesson fr-does-not-exist is not part of any course.')).toBeInTheDocument();
  });
});
