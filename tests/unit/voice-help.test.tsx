import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { detectPlatform } from '../../src/session/speech.ts';
import { VoiceHelp } from '../../src/session/VoiceHelp.tsx';
import { rendererRegistry } from '../../src/session/renderers.tsx';

afterEach(cleanup);
// jsdom has no modal dialogs; the real behaviour is covered in tests/e2e/session.spec.ts.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; };

it.each([
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0', 0, 'windows', 'firefox'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0, 'windows', 'edge'],
  ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 0, 'linux', 'chrome'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 0, 'mac', 'safari'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 5, 'ios', 'safari'],
  ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36', 5, 'android', 'chrome'],
  ['Mozilla/5.0 (X11; CrOS x86_64 16000.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 0, 'chromeos', 'chrome'],
])('detects %s', (userAgent, maxTouchPoints, os, browser) => {
  expect(detectPlatform({ userAgent, maxTouchPoints })).toEqual({ os, browser });
});

const renderHelp = (os: 'windows' | 'mac' | 'linux', browser: 'firefox' | 'chrome' | 'other', interfaceLanguage: 'en' | 'de' = 'en') =>
  render(<PreferencesProvider initial={{ interfaceLanguage, motherTongue: 'en' }}><VoiceHelp platform={{ os, browser }} /></PreferencesProvider>).container;

it('shows only the learner’s own system: Windows language feature, Firefox version note', () => {
  const help = renderHelp('windows', 'firefox');
  expect(help).toHaveTextContent('Steps for Windows with Firefox:');
  expect(help).toHaveTextContent('Settings → Time & language → Language & region');
  expect(help).toHaveTextContent('Tick Text-to-speech');
  expect(help).toHaveTextContent('version 106');
  expect(help).toHaveTextContent('Close every Firefox window and start Firefox again.');
  expect(help).not.toHaveTextContent(/macOS|Linux|speech-dispatcher|Google/);
});

it('gives Linux install and test commands with the Snap/Flatpak caveat', () => {
  const help = renderHelp('linux', 'firefox');
  expect(help.querySelectorAll('code')[0]).toHaveTextContent('sudo apt install speech-dispatcher espeak-ng');
  expect(help).toHaveTextContent('spd-say -l fr bonjour');
  expect(help).toHaveTextContent(/Snap and Flatpak browsers .* 0\.11\.4/);
  expect(help).not.toHaveTextContent(/Windows|Google/);
});

it('points macOS Chrome users to Manage Voices and the online Google voice', () => {
  const help = renderHelp('mac', 'chrome');
  expect(help).toHaveTextContent('System Settings → Accessibility → Spoken Content');
  expect(help).toHaveTextContent('Manage Voices…');
  expect(help).toHaveTextContent('Google français');
});

it('keeps German sentences grammatical for an unknown browser', () => {
  const help = renderHelp('windows', 'other', 'de');
  expect(help).toHaveTextContent('Schritte für Windows mit deinem Browser:');
  expect(help).toHaveTextContent('Schließe alle Browserfenster und starte den Browser neu.');
  expect(help).toHaveTextContent('„Text-zu-Sprache“');
});

it('replaces Listen with an Install language button that opens the help dialog when no voice exists', () => {
  const item = { type: 'vocabulary_flashcards', itemId: 'f', targetIds: ['t'] };
  const plan = { lang: 'fr', targets: new Map([['t', { id: 't', teachingForm: 'la lettre', translations: { en: ['letter'] }, genders: ['feminine'], context: { sentence: 'Une lettre.', translation: { en: 'A letter.' } } }]]) };
  const Renderer = rendererRegistry.vocabulary_flashcards;
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>
    {/* @ts-expect-error minimal plan and item for the flashcard renderer */}
    <Renderer item={item} units={[]} plan={plan} mode="answering" drafts={{}} locked={{}} onChange={() => undefined} seed={1} motherTongue="en" pageId="p" revealed={{ 'p/f': ['t'] }} onReveal={() => undefined} />
  </PreferencesProvider>);
  expect(screen.queryByRole('button', { name: 'Listen' })).toBeNull();
  // The word and the example sentence both offer installation help.
  const install = screen.getAllByRole('button', { name: 'Install language' });
  expect(install).toHaveLength(2);
  fireEvent.click(install[0]);
  const dialog = screen.getAllByRole('dialog', { name: 'French voice not installed' }).find((d) => d.hasAttribute('open'))!;
  expect(dialog).toHaveAttribute('open');
  expect(dialog).toHaveTextContent(/no French text-to-speech voice .*Steps for .+ with .+:/);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(dialog).not.toHaveAttribute('open');
});
