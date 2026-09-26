const text = (value) => typeof value === 'string' ? value : '';
const list = (value) => Array.isArray(value) ? value : [];
export function safeLinkedIn(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && /^(www\.)?linkedin\.com$/.test(url.hostname) && url.pathname.startsWith('/in/') ? `${url.origin}${url.pathname}` : ''; } catch { return ''; }
}
function safeImage(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}
export function normalize(record) {
  const p = record.profile || record.candidate || {};
  const l = record.linkedin_enrichment?.status === 'enriched' ? record.linkedin_enrichment.data || {} : {};
  return { id: text(record.id), name: text(p.display_name) || 'Unbekannt', company: text(p.company), role: text(p.role),
    avatars: [...new Set([p.avatar_url, record.candidate?.avatar_url, l.profilePicture, p.match_photo_url].map(safeImage).filter(Boolean))],
    headline: text(l.headline) || text(p.job_title) || text(p.startup_one_liner) || text(p.company),
    summary: text(l.summary) || text(p.bio), location: text(l.geo?.full),
    interests: list(p.interests).filter(x => typeof x === 'string'),
    skills: list(l.skills).map(s => text(typeof s === 'string' ? s : s.name)).filter(Boolean),
    experience: list(l.position).map(e => ({ title: text(e.title), company: text(e.companyName), description: text(e.description), start: e.start?.year || null, end: e.end?.year || null })),
    education: list(l.educations).map(e => ({ school: text(e.schoolName), degree: text(e.degree), field: text(e.fieldOfStudy) })),
    linkedin: safeLinkedIn(record.linkedin_url), enriched: record.linkedin_enrichment?.status === 'enriched',
    fetchedAt: record.linkedin_enrichment?.fetched_at || record.fetched_at || null,
    source: record.linkedin_enrichment?.status === 'enriched' ? 'LinkedIn + IdeaLab' : 'IdeaLab' };
}
const words = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}+#]+/gu) || [];
export function searchCandidates(profiles, query = '', { linkedInOnly = false, limit = 1000 } = {}) {
  const stop = new Set(['ich','suche','einen','eine','einem','mit','und','der','die','das','fur','in','a','the','and']);
  const queryWords = words(query);
  const terms = [...new Set(queryWords.filter(w => queryWords.length === 1 || !stop.has(w)))];
  return profiles.filter(p => !linkedInOnly || p.linkedin).map(p => {
    const fields = [p.name, p.headline, p.company, p.location, p.summary, ...p.interests, ...p.skills, ...p.experience.map(e => `${e.title} ${e.company} ${e.description}`), ...p.education.map(e => `${e.school} ${e.degree} ${e.field}`)];
    const tokens = new Set(words(fields.join(' ')));
    const matches = terms.filter(t => tokens.has(t) || (t === 'ki' && tokens.has('ai')) || [...tokens].some(w => w.startsWith(t)));
    return { ...p, matches, searchScore: matches.length };
  }).filter(p => !terms.length || p.searchScore > 0).sort((a,b) => b.searchScore - a.searchScore || Number(b.enriched) - Number(a.enriched) || a.name.localeCompare(b.name)).slice(0, limit);
}
export function interviewFor(p) {
  return { candidateId: p.id, name: p.name, title: `Erstes Co-Founder-Gespräch mit ${p.name}`, duration: '30 Minuten', sections: [
    { title: 'Motivation & gemeinsame Richtung', minutes: 5, questions: ['Welches Problem würdest du auch dann lösen wollen, wenn es länger dauert als geplant?', 'Was erwartest du von einer Co-Founder-Partnerschaft?'] },
    { title: 'Erfahrung an einem konkreten Beispiel', minutes: 10, questions: [p.experience[0] ? `Bei ${p.experience[0].company || 'deiner letzten Station'} warst du ${p.experience[0].title}. Was hast du persönlich umgesetzt und welches Ergebnis erreicht?` : 'Welches Projekt zeigt am besten, was du selbst aufbauen kannst?', 'Welche schwierige Entscheidung hast du getroffen und was würdest du heute anders machen?'] },
    { title: 'Zusammenarbeit & Rahmenbedingungen', minutes: 10, questions: ['Wie viel Zeit kannst du ab wann verbindlich investieren?', 'Wie gehen wir mit Konflikten, Rollenverteilung und unterschiedlichen Risikovorstellungen um?', 'Welche Erwartungen hast du an Finanzierung, Anteile und persönliche finanzielle Absicherung?'] },
    { title: 'Nächster gemeinsamer Schritt', minutes: 5, questions: ['Welches kleine Projekt könnten wir zwei Wochen lang gemeinsam ausprobieren?', 'Woran würden wir beide erkennen, dass die Zusammenarbeit funktioniert?'] }
  ], unknowns: ['Gründungsinteresse', 'Verfügbarkeit', 'Arbeitsweise', 'Erwartungen an Anteile'].map(x => `${x}: im Gespräch klären, nicht aus dem Profil ableiten.`) };
}
