import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let api;
try {
  api = new URL(process.env.SMS_API_URL ?? '');
} catch {
  throw new Error('Set SMS_API_URL to the deployed Spring Boot HTTPS origin before building.');
}
if (
  api.protocol !== 'https:' ||
  api.username ||
  api.password ||
  api.pathname !== '/' ||
  api.search ||
  api.hash
) {
  throw new Error(
    'SMS_API_URL must be an HTTPS origin, for example https://sms-api.vercel.app (no path, query, or credentials).',
  );
}

mkdirSync(new URL('../src/environments/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../src/environments/environment.vercel.ts', import.meta.url),
  `export const environment = ${JSON.stringify({ apiBaseUrl: api.origin }, null, 2)};\n`,
);

const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url)),
    'build',
    '--configuration=production,vercel',
  ],
  { cwd: root, stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
