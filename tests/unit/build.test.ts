import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findLeaks, secretValues } from '../../scripts/build.ts';

describe('build output secret check', () => {
  it('reads non-trivial .env values, ignoring blanks and comments', () => {
    expect(secretValues('# local only\nGEMINI_API_KEY="abcdefgh12345"\nGEMINI_MODEL=gemini-test-model\nSHORT=abc\n')).toEqual(['abcdefgh12345']);
    expect(secretValues('GEMINI_API_KEY=abcdefgh12345, ijklmnop67890\n')).toEqual(['abcdefgh12345', 'ijklmnop67890']);
  });

  it('flags .env files and leaked values in dist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<div id="root"></div>');
    writeFileSync(join(dir, 'assets', 'app.js'), 'const k="abcdefgh12345";');
    writeFileSync(join(dir, '.env'), 'X=1');
    expect(findLeaks(dir, ['abcdefgh12345']).sort()).toEqual([
      '.env: environment file in build output',
      'assets/app.js: contains a value from .env',
    ]);
  });

  it('accepts a clean dist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dist-'));
    writeFileSync(join(dir, 'index.html'), '<div id="root"></div>');
    expect(findLeaks(dir, ['abcdefgh12345'])).toEqual([]);
  });
});
