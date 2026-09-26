import { mkdir, writeFile } from 'node:fs/promises';
import { loadCandidates } from '../server/load-candidates.mjs';

// Bundle only the same normalized fields exposed by the local API.
// Raw exports and credentials never enter the public assets directory.
const profiles = await loadCandidates();
const directory = new URL('../generated/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('candidates.json', directory), JSON.stringify(profiles), { mode: 0o600 });
console.log(`Prepared ${profiles.length} profiles for Voya.`);
