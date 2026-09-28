/**
 * Interview-Leitfaden (Voya: prepare_interview).
 * ---------------------------------------------------------------
 * Port von Renés `interviewFor` (web/server/candidates.mjs) auf unseren Profile-Typ.
 * Isomorph: läuft im Browser (Voice-Tools) und auf dem Server. Deterministisch, ohne LLM –
 * der Leitfaden ist damit "belegbar": Fragen leiten sich nur aus tatsächlichen Profildaten
 * (konkrete berufliche Station) und aus dem Nutzer-Kontext ab. Was sich NICHT aus dem Profil
 * ableiten lässt, steht ausdrücklich unter `unknowns`.
 *
 * Nur `downloadMarkdown` ist browser-spezifisch (guard für window).
 */
import type { FounderRole, InterviewGuide, InterviewGuideSection, NetworkRole, Profile, UserContext } from "./types";

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial / Business",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expertise",
};

const TITLE_BY_ROLE: Record<NetworkRole, (name: string) => string> = {
  cofounder: (name) => `Erstes Co-Founder-Gespräch mit ${name}`,
  investor: (name) => `Erstes Investoren-Gespräch mit ${name}`,
  mentor: (name) => `Erstes Mentoring-Gespräch mit ${name}`,
  talent: (name) => `Erstes Kennenlern-Gespräch mit ${name}`,
  expert: (name) => `Erstes Experten-Gespräch mit ${name}`,
};

/** Was sich aus keinem Profil ableiten lässt – je Ökosystem-Rolle. */
const UNKNOWNS_BY_ROLE: Record<NetworkRole, string[]> = {
  cofounder: ["Gründungsinteresse", "Verfügbarkeit", "Arbeitsweise", "Erwartungen an Anteile"],
  investor: ["Aktueller Investitionsfokus", "Ticketgröße", "Entscheidungsprozess", "Erwartungen an Traction"],
  mentor: ["Zeitbudget", "Erwartungen an die Zusammenarbeit", "Themen, bei denen die Person wirklich helfen will"],
  talent: ["Wechselbereitschaft", "Verfügbarkeit", "Gehalts- und Equity-Erwartungen", "Arbeitsweise"],
  expert: ["Verfügbarkeit", "Konditionen", "Tiefe der Expertise im konkreten Problem"],
};

function truncate(text: string | undefined, max: number): string {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function joinDe(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

/** Frage zur konkreten beruflichen Station (experience[0]) – wie bei René, nur mit unserem Typ. */
function experienceQuestion(p: Profile): string {
  const first = p.experience?.[0];
  if (!first) return "Welches Projekt zeigt am besten, was du selbst aufbauen kannst?";
  const company = first.company?.trim() || "deiner letzten Station";
  const title = first.title?.trim();
  return title
    ? `Bei ${company} warst du ${title}. Was hast du persönlich umgesetzt und welches Ergebnis erreicht?`
    : `Bei ${company}: Was hast du dort persönlich umgesetzt und welches Ergebnis erreicht?`;
}

/** 1–2 Fragen aus dem Nutzer-Kontext (Idee, gesuchte Rollen, Rahmenbedingungen). */
function userQuestions(user: UserContext | null | undefined, role: NetworkRole): { idea?: string; roles?: string; constraints?: string } {
  if (!user) return {};
  const out: { idea?: string; roles?: string; constraints?: string } = {};

  const idea = truncate(user.idea, 160);
  if (idea) {
    out.idea =
      role === "investor"
        ? `Meine Idee in einem Satz: „${idea}“ – was wäre deine erste kritische Frage als Investor:in?`
        : `Meine Idee in einem Satz: „${idea}“ – was überzeugt dich daran, und was fehlt dir noch?`;
  }

  const roles = (user.lookingForRoles ?? []).map((r) => FOUNDER_ROLE_LABELS[r] ?? r);
  if (roles.length > 0 && (role === "cofounder" || role === "talent")) {
    out.roles = `Ich suche jemanden für ${joinDe(roles)}. Welches Beispiel aus deiner Arbeit zeigt genau diese Stärke?`;
  }

  const constraints = truncate(user.constraints, 140);
  if (constraints) {
    out.constraints = `Meine Rahmenbedingungen: ${constraints}. Wie passt das für dich?`;
  }
  return out;
}

function sectionsFor(p: Profile, user: UserContext | null | undefined): InterviewGuideSection[] {
  const role = p.networkRole;
  const extra = userQuestions(user, role);

  const motivation: InterviewGuideSection = {
    title: "Motivation & gemeinsame Richtung",
    minutes: 5,
    questions:
      role === "investor"
        ? ["Welche Gründerteams haben dich zuletzt überzeugt – und warum?", "Was muss eine Idee haben, damit du in dieser Phase Zeit investierst?"]
        : role === "mentor" || role === "expert"
          ? ["Welche Art von Gründer:innen begleitest du am liebsten – und woran merkst du, dass es passt?", "Was erwartest du dir selbst von so einem Austausch?"]
          : [
              "Welches Problem würdest du auch dann lösen wollen, wenn es länger dauert als geplant?",
              role === "talent"
                ? "Was erwartest du von einem Team in einer sehr frühen Phase?"
                : "Was erwartest du von einer Co-Founder-Partnerschaft?",
            ],
  };
  if (extra.idea) motivation.questions.push(extra.idea);

  const experience: InterviewGuideSection = {
    title: "Erfahrung an einem konkreten Beispiel",
    minutes: 10,
    questions: [experienceQuestion(p), "Welche schwierige Entscheidung hast du getroffen und was würdest du heute anders machen?"],
  };
  if (extra.roles) experience.questions.push(extra.roles);

  const collaboration: InterviewGuideSection = {
    title: "Zusammenarbeit & Rahmenbedingungen",
    minutes: 10,
    questions:
      role === "investor"
        ? [
            "Wie sieht dein Prozess vom Erstgespräch bis zur Entscheidung aus – und wie lange dauert er typischerweise?",
            "Welche Ticketgröße und Beteiligung sind für dich in dieser Phase realistisch?",
            "Wie arbeitest du nach dem Investment mit dem Team zusammen?",
          ]
        : role === "mentor" || role === "expert"
          ? [
              "Wie viel Zeit kannst du realistisch investieren, und in welchem Rhythmus?",
              "Wie stellst du dir die Zusammenarbeit vor – Sparring, Intros, konkrete Aufgaben?",
              "Welche Erwartungen hast du an Gegenleistung oder Beteiligung?",
            ]
          : [
              "Wie viel Zeit kannst du ab wann verbindlich investieren?",
              "Wie gehen wir mit Konflikten, Rollenverteilung und unterschiedlichen Risikovorstellungen um?",
              "Welche Erwartungen hast du an Finanzierung, Anteile und persönliche finanzielle Absicherung?",
            ],
  };
  if (extra.constraints) collaboration.questions.push(extra.constraints);

  const next: InterviewGuideSection = {
    title: "Nächster gemeinsamer Schritt",
    minutes: 5,
    questions:
      role === "investor"
        ? ["Was bräuchtest du von uns, um in ein zweites Gespräch zu gehen?", "Wen aus deinem Netzwerk sollten wir unabhängig davon kennenlernen?"]
        : ["Welches kleine Projekt könnten wir zwei Wochen lang gemeinsam ausprobieren?", "Woran würden wir beide erkennen, dass die Zusammenarbeit funktioniert?"],
  };

  return [motivation, experience, collaboration, next];
}

/**
 * Baut einen belegbaren 30-Minuten-Leitfaden für ein Erstgespräch mit `profile`.
 * `user` (optional) ergänzt 1–2 Fragen aus Idee, gesuchten Rollen und Rahmenbedingungen.
 */
export function buildInterviewGuide(profile: Profile, user?: UserContext | null): InterviewGuide {
  const role = profile.networkRole;
  const title = (TITLE_BY_ROLE[role] ?? TITLE_BY_ROLE.cofounder)(profile.name);
  const sections = sectionsFor(profile, user);
  const total = sections.reduce((sum, s) => sum + s.minutes, 0);
  return {
    profileId: profile.id,
    name: profile.name,
    title,
    duration: `${total} Minuten`,
    sections,
    unknowns: (UNKNOWNS_BY_ROLE[role] ?? UNKNOWNS_BY_ROLE.cofounder).map(
      (x) => `${x}: im Gespräch klären, nicht aus dem Profil ableiten.`,
    ),
  };
}

/** Markdown-Export (wie Renés „Download als Markdown“). */
export function interviewGuideToMarkdown(guide: InterviewGuide): string {
  const sections = guide.sections
    .map((s) => `## ${s.title} (${s.minutes} Min.)\n\n${s.questions.map((q) => `- ${q}`).join("\n")}`)
    .join("\n\n");
  const unknowns = guide.unknowns.length > 0 ? `\n\n## Offene Punkte – nicht aus dem Profil ableitbar\n\n${guide.unknowns.map((x) => `- ${x}`).join("\n")}` : "";
  return `# ${guide.title}\n\n${guide.duration}\n\n${sections}${unknowns}\n`;
}

/** Dateiname für den Download, z. B. `interview-lena-hoffmann.md`. */
export function interviewGuideFilename(guide: InterviewGuide): string {
  const slug = guide.profileId.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "leitfaden";
  return `interview-${slug}.md`;
}

/** Browser-Helfer: lädt `content` als Markdown-Datei herunter. Serverseitig ein No-op. */
export function downloadMarkdown(filename: string, content: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* Download nicht möglich (z. B. eingeschränkte Umgebung) – bewusst still. */
  }
}
