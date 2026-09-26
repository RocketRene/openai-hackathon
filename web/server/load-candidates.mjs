import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export const defaultFile = fileURLToPath(new URL('../../exports/all-enriched-profiles.json', import.meta.url));
import { normalize } from './candidates.mjs';
let cache;
export async function loadCandidates(file = process.env.CANDIDATES_FILE || defaultFile) {
  const info = await stat(file);
  if (!cache || cache.file !== file || cache.mtime !== info.mtimeMs) {
    const raw = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(raw.profiles)) throw new Error('Kandidatendatei enthält kein profiles-Array.');
    cache = { file, mtime: info.mtimeMs, profiles: raw.profiles.map(normalize) };
  }
  return cache.profiles;
}
