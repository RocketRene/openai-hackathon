import profiles from '../generated/candidates.json';
import { searchCandidates, interviewFor } from './candidates.mjs';
import { agentTurn, executeTool, instructions, tools } from './agent.mjs';

const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256 * 1024) {
      await reader.cancel();
      throw Object.assign(new Error('Anfrage ist zu groß.'), { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw Object.assign(new Error('Ungültige JSON-Daten.'), { status: 400 }); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (request.method === 'GET' && url.pathname === '/api/status') {
        return json({ total: profiles.length, linkedin: profiles.filter(p => p.linkedin).length, enriched: profiles.filter(p => p.enriched).length, ai: !!env.OPENAI_API_KEY, room: !!env.REALTIMEKIT_AUTH_TOKEN });
      }
      if (request.method === 'GET' && url.pathname === '/api/candidates') {
        return json({ candidates: searchCandidates(profiles, (url.searchParams.get('q') || '').slice(0, 500), { linkedInOnly: url.searchParams.get('linkedin') === 'true' }) });
      }
      const interview = url.pathname.match(/^\/api\/candidates\/([^/]+)\/interview$/);
      if (request.method === 'GET' && interview) {
        const candidate = profiles.find(p => p.id === decodeURIComponent(interview[1]));
        return candidate ? json(interviewFor(candidate)) : json({ error: 'Kandidat nicht gefunden.' }, 404);
      }
      if (request.method !== 'POST') return json({ error: 'API-Route nicht gefunden.' }, 404);
      const body = await readBody(request);
      if (url.pathname === '/api/agent') {
        if (!env.OPENAI_API_KEY) return json({ error: 'OpenAI ist nicht konfiguriert.' }, 503);
        const { messages, brief = {} } = body || {};
        if (!Array.isArray(messages) || !messages.length || messages.length > 80 || messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 12000)) return json({ error: 'Ungültiger Gesprächsverlauf.' }, 400);
        return json(await agentTurn(messages, brief, profiles, fetch, env));
      }
      if (url.pathname === '/api/tools') {
        try { return json(executeTool(body?.name, body?.args, profiles)); }
        catch (error) { return json({ error: error.message }, 400); }
      }
      if (url.pathname === '/api/realtime') {
        if (!env.OPENAI_API_KEY) return json({ error: 'OpenAI ist nicht konfiguriert.' }, 503);
        if (typeof body?.sdp !== 'string' || !body.sdp.startsWith('v=0')) return json({ error: 'Ungültiges Audio-Verbindungsangebot.' }, 400);
        const fd = new FormData();
        fd.set('sdp', body.sdp);
        fd.set('session', JSON.stringify({ type: 'realtime', model: env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1', reasoning: { effort: 'medium' }, instructions: instructions + '\nAktuelles Suchprofil: ' + JSON.stringify(body.brief || {}), tools, audio: { input: { transcription: { model: 'gpt-4o-mini-transcribe', language: 'de' }, turn_detection: { type: 'server_vad', create_response: true, interrupt_response: true } }, output: { voice: 'marin' } } }));
        const response = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: fd, signal: AbortSignal.timeout(30000) });
        if (!response.ok) return json({ error: `Sprachverbindung fehlgeschlagen (HTTP ${response.status}).` }, 502);
        return new Response(response.body, { headers: { 'Content-Type': 'application/sdp', 'Cache-Control': 'no-store' } });
      }
      if (url.pathname === '/api/room') {
        return env.REALTIMEKIT_AUTH_TOKEN ? json({ authToken: env.REALTIMEKIT_AUTH_TOKEN }) : json({ error: 'Für den Interviewraum fehlt ein RealtimeKit-Teilnehmertoken.' }, 503);
      }
      return json({ error: 'API-Route nicht gefunden.' }, 404);
    } catch (error) {
      return json({ error: error.status ? error.message : 'Die Anfrage ist fehlgeschlagen. Bitte erneut versuchen.' }, error.status || 502);
    }
  },
};
