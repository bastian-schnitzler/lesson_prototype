import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DEFAULT_CONTENT_DIR } from '../scripts/catalog.ts';
import { generateBrief, generateMissingBriefs, generateSampleBriefs } from './briefs.ts';
import { generateLesson, generateMissingLessons } from './content.ts';
import { geminiAdapter, GenerationError, loadBatchConfig, loadConfig, type BriefAdapter } from './gemini.ts';

if (import.meta.main) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      id: { type: 'string' }, regenerate: { type: 'boolean' }, 'content-dir': { type: 'string' }, env: { type: 'string' },
    } });
    const command = positionals[0];
    const single = command === 'brief' || command === 'generate';
    if (positionals.length !== 1 || !['brief', 'briefs-missing', 'sample-briefs', 'generate', 'generate-missing'].includes(command)) {
      throw new GenerationError('Use make brief ID=<id>, make briefs-missing, make sample-briefs, make generate ID=<id> or make generate-missing.');
    }
    if (single && !values.id) throw new GenerationError(`ID is required: make ${command} ID=<lesson-id>.`);
    if (!single && (values.id || values.regenerate)) throw new GenerationError('Batch mode only generates missing artifacts; regenerate individual IDs explicitly.');
    let adapter: BriefAdapter | undefined;
    const report = (message: string) => process.stdout.write(`${message}\n`);
    const options = {
      contentDir: resolve(values['content-dir'] ?? DEFAULT_CONTENT_DIR), regenerate: values.regenerate,
      adapter: () => adapter ??= geminiAdapter(loadConfig(resolve(values.env ?? '.env')), fetch, undefined, report),
      ...(single ? {} : loadBatchConfig(resolve(values.env ?? '.env'))),
      report,
    };
    if (single) {
      const result = command === 'brief' ? await generateBrief(values.id!, options) : await generateLesson(values.id!, options);
      const brief = 'brief' in result ? ` (brief ${result.brief})` : '';
      process.stdout.write(`${result.id}: ${result.status}${brief}${result.message ? ` — ${result.message}` : ''}\n`);
    } else {
      const batch = { 'briefs-missing': generateMissingBriefs, 'sample-briefs': generateSampleBriefs, 'generate-missing': generateMissingLessons }[command as 'briefs-missing'];
      const results = await batch(options);
      process.stdout.write(['generated', 'reused', 'skipped', 'failed'].map((status) => `${status}: ${results.filter((r) => r.status === status).length}`).join(', ') + '\n');
      if (results.some((r) => r.status === 'failed')) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`error: ${error instanceof GenerationError ? error.message : 'Invalid arguments or local file operation failed; consult make help.'}\n`);
    process.exitCode = 1;
  }
}
