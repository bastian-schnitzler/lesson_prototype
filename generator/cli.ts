import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DEFAULT_CONTENT_DIR } from '../scripts/catalog.ts';
import { generateBrief, generateMissingBriefs, generateSampleBriefs } from './briefs.ts';
import { geminiAdapter, GenerationError, loadBatchConfig, loadConfig, type BriefAdapter } from './gemini.ts';

if (import.meta.main) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      id: { type: 'string' }, regenerate: { type: 'boolean' }, 'content-dir': { type: 'string' }, env: { type: 'string' },
    } });
    const command = positionals[0];
    if (positionals.length !== 1 || !['brief', 'briefs-missing', 'sample-briefs'].includes(command)) throw new GenerationError('Use make brief ID=<id>, make briefs-missing or make sample-briefs.');
    if (command === 'brief' && !values.id) throw new GenerationError('ID is required: make brief ID=<lesson-id>.');
    if (command !== 'brief' && (values.id || values.regenerate)) throw new GenerationError('Batch mode only generates missing briefs; regenerate individual IDs explicitly.');
    let adapter: BriefAdapter | undefined;
    const report = (message: string) => process.stdout.write(`${message}\n`);
    const options = {
      contentDir: resolve(values['content-dir'] ?? DEFAULT_CONTENT_DIR), regenerate: values.regenerate,
      adapter: () => adapter ??= geminiAdapter(loadConfig(resolve(values.env ?? '.env')), fetch, undefined, report),
      ...(command === 'brief' ? {} : loadBatchConfig(resolve(values.env ?? '.env'))),
      report,
    };
    if (command === 'brief') {
      const result = await generateBrief(values.id!, options);
      process.stdout.write(`${result.id}: ${result.status}${result.message ? ` — ${result.message}` : ''}\n`);
    } else {
      const results = await (command === 'sample-briefs' ? generateSampleBriefs : generateMissingBriefs)(options);
      process.stdout.write(['generated', 'reused', 'skipped', 'failed'].map((status) => `${status}: ${results.filter((r) => r.status === status).length}`).join(', ') + '\n');
      if (results.some((r) => r.status === 'failed')) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`error: ${error instanceof GenerationError ? error.message : 'Invalid arguments or local file operation failed; consult make help.'}\n`);
    process.exitCode = 1;
  }
}
