import express from 'express';
import { fileURLToPath } from 'node:url';
import { searchCandidates, interviewFor } from './candidates.mjs';
import { loadCandidates } from './load-candidates.mjs';
import { agentTurn, executeTool, instructions, tools } from './agent.mjs';
const app = express();
const port = Number(process.env.PORT || 5173);
app.disable('x-powered-by');
app.use('/api', (req,res,next) => {
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  if (!hosts.has(req.headers.host)) return res.status(403).json({error:'Nur lokaler Zugriff erlaubt.'});
  if (req.headers.origin && ![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)) return res.status(403).json({error:'Unerlaubter Ursprung.'});
  res.set('Cache-Control', 'no-store'); next();
});
app.use(express.json({ limit: '256kb' }));
app.get('/api/status', async (_req,res) => {
  const profiles = await loadCandidates();
  res.json({ total:profiles.length, linkedin:profiles.filter(p=>p.linkedin).length, enriched:profiles.filter(p=>p.enriched).length, ai:!!process.env.OPENAI_API_KEY, room:!!process.env.REALTIMEKIT_AUTH_TOKEN });
});
app.get('/api/candidates', async (req,res) => res.json({ candidates:searchCandidates(await loadCandidates(), String(req.query.q || '').slice(0,500), { linkedInOnly:req.query.linkedin==='true' }) }));
app.get('/api/candidates/:id/interview', async(req,res) => {
  const candidate = (await loadCandidates()).find(p => p.id === req.params.id);
  if (!candidate) return res.status(404).json({error:'Kandidat nicht gefunden.'});
  res.json(interviewFor(candidate));
});
app.post('/api/agent', async(req,res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({error:'Für den KI-Dialog bitte OPENAI_API_KEY in der lokalen Server-Konfiguration setzen.'});
  const { messages, brief = {} } = req.body || {};
  if (!Array.isArray(messages) || !messages.length || messages.length > 80 || messages.some(m=>!['user','assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 12000)) return res.status(400).json({error:'Ungültiger Gesprächsverlauf.'});
  res.json(await agentTurn(messages, brief, await loadCandidates()));
});
app.post('/api/tools', async(req,res) => {
  try { res.json(executeTool(req.body?.name,req.body?.args,await loadCandidates())); }
  catch(error) { res.status(400).json({error:error.message}); }
});
app.post('/api/realtime', async(req,res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({error:'OPENAI_API_KEY fehlt. Trage ihn in web/.env ein und starte die App neu.'});
  if (typeof req.body?.sdp !== 'string' || !req.body.sdp.startsWith('v=0')) return res.status(400).json({error:'Ungültiges Audio-Verbindungsangebot.'});
  const fd = new FormData();
  fd.set('sdp', req.body.sdp);
  fd.set('session',JSON.stringify({type:'realtime',model:process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1', reasoning: { effort: 'medium' }, instructions: instructions + '\nAktuelles Suchprofil: ' + JSON.stringify(req.body.brief || {}), tools, audio:{input:{transcription:{model:'gpt-4o-mini-transcribe',language:'de'},turn_detection:{type:'server_vad',create_response:true,interrupt_response:true}},output:{voice:'marin'}}}));
  const response = await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:fd,signal:AbortSignal.timeout(30000)});
  if (!response.ok) return res.status(502).json({error:`Sprachverbindung fehlgeschlagen (HTTP ${response.status}). API-Zugang und Realtime-Modell prüfen.`});
  res.type('application/sdp').send(await response.text());
});
app.post('/api/room',(_req,res)=> {
  if (!process.env.REALTIMEKIT_AUTH_TOKEN) return res.status(503).json({error:'Für den Interviewraum fehlt ein RealtimeKit-Teilnehmertoken.'});
  res.json({authToken:process.env.REALTIMEKIT_AUTH_TOKEN});
});
app.use('/api',(_req,res)=>res.status(404).json({error:'API-Route nicht gefunden.'}));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(fileURLToPath(new URL('../dist',import.meta.url))));
  app.get('/{*path}',(_req,res)=>res.sendFile(fileURLToPath(new URL('../dist/index.html',import.meta.url))));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
}
app.use((error, _req,res,_next)=>{
  const message = error.code === 'ENOENT' ? 'Kandidatendatei fehlt. CANDIDATES_FILE auf den vorhandenen Export setzen.' : error.type === 'entity.too.large' ? 'Anfrage ist zu groß.' : error instanceof SyntaxError ? 'Ungültige JSON-Daten.' : error.message || 'Die Anfrage ist fehlgeschlagen.';
  res.status(error.status || 500).json({error:message});
});
app.listen(port,'127.0.0.1',()=>console.log(`Voya läuft auf http://localhost:${port}`));
