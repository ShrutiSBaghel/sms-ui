import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

for (const url of [
  '',
  'http://localhost:8080',
  'https://user:private-password@api.example.com',
  'https://api.example.com/path',
  'https://api.example.com?token=private-password',
  'https://api.example.com#fragment',
]) {
  test(`rejects invalid API configuration (${url ? new URL(url).protocol : 'missing'})`, () => {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('./build-vercel.mjs', import.meta.url)),
    ], { env: { ...process.env, SMS_API_URL: url }, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SMS_API_URL/);
    assert.doesNotMatch(result.stderr, /private-password/);
  });
}
