import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const secrets = Object.fromEntries(['OPENAI_API_KEY', 'REALTIMEKIT_AUTH_TOKEN']
  .filter(name => process.env[name]).map(name => [name, process.env[name]]));
if (!secrets.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing.');
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)), 'secret', 'bulk'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: ['pipe', 'inherit', 'inherit'],
});
child.stdin.end(JSON.stringify(secrets));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
