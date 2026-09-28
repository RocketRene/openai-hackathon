/**
 * Belegbarer 30-Minuten-Interviewleitfaden (Port von Voya `interviewFor`, web/server/candidates.mjs).
 * ---------------------------------------------------------------
 * Deterministisch, ohne LLM: vier Abschnitte mit Minuten, Fragen mit Bezug auf die erste
 * berufliche Station (`profile.experience[0]`) und eine Liste dessen, was sich NICHT aus dem
 * Profil ableiten lässt („im Gespräch klären“). Die Fragen richten sich nach der
 * `networkRole` der Person (Co-Founder, Investor:in, Mentor:in, Talent, Expert:in) und nehmen,
 * wenn vorhanden, den Nutzer-Kontext (Idee, gesuchte Rolle) auf.
 *
 * Nur Typen aus types.ts – keine Laufzeit-Imports, damit die Datei auch unter
 * `node --test` (Type-Stripping) läuft.
 */
import type { InterviewGuide, InterviewGuideSection, NetworkRole, Profile, UserContext } from "./types";

const DURATION = "30 Minuten";

const TITLE_BY_ROLE: Record<NetworkRole, (name: string) => string> = {
  cofounder: (name) => `Erstes Co-Founder-Gespräch mit ${name}`,
  investor: (name) => `Erstgespräch mit Investor:in ${name}`,
  mentor: (name) => `Erstgespräch mit Mentor:in ${name}`,
  talent: (name) => `Kennenlerngespräch mit ${name}`,
  expert: (name) => `Expertengespräch mit ${name}`,
};

const FOUNDER_ROLE_LABELS: Record<string, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Produkt",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Fachexpertise",
};

function truncate(text: string | undefined, max: number): string {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Kurzform der Idee für eine Frage, oder leer. */
function ideaSnippet(user: UserContext | null | undefined): string {
  return truncate(user?.idea, 120);
}

/** „Bei {company} warst du {title}.“ – Bezug auf die erste berufliche Station. */
function experienceQuestion(profile: Profile, fallback: string): string {
  const first = profile.experience?.[0];
  if (!first || (!first.title && !first.company)) return fallback;
  const company = first.company?.trim() || "deiner letzten Station";
  const title = first.title?.trim() || "tätig";
  const tense = first.end ? "warst du" : "bist du";
  return `Bei ${company} ${tense} ${title}. Was hast du dort persönlich umgesetzt und welches Ergebnis erreicht?`;
}

function cofounderSections(profile: Profile, user: UserContext | null | undefined): InterviewGuideSection[] {
  const idea = ideaSnippet(user);
  const wantedRole = user?.lookingForRoles?.[0] ? FOUNDER_ROLE_LABELS[user.lookingForRoles[0]] : undefined;
  return [
    {
      title: "Motivation & gemeinsame Richtung",
      minutes: 5,
      questions: [
        "Welches Problem würdest du auch dann lösen wollen, wenn es länger dauert als geplant?",
        idea
          ? `Ich arbeite an: „${idea}“ – was daran reizt dich, was macht dich skeptisch?`
          : "Was erwartest du von einer Co-Founder-Partnerschaft?",
      ],
    },
    {
      title: "Erfahrung an einem konkreten Beispiel",
      minutes: 10,
      questions: [
        experienceQuestion(profile, "Welches Projekt zeigt am besten, was du selbst aufbauen kannst?"),
        "Welche schwierige Entscheidung hast du getroffen und was würdest du heute anders machen?",
        ...(wantedRole ? [`Ich suche vor allem Ergänzung im Bereich ${wantedRole} – wo siehst du dich da, ehrlich?`] : []),
      ],
    },
    {
      title: "Zusammenarbeit & Rahmenbedingungen",
      minutes: 10,
      questions: [
        "Wie viel Zeit kannst du ab wann verbindlich investieren?",
        "Wie gehen wir mit Konflikten, Rollenverteilung und unterschiedlichen Risikovorstellungen um?",
        "Welche Erwartungen hast du an Finanzierung, Anteile und persönliche finanzielle Absicherung?",
      ],
    },
    {
      title: "Nächster gemeinsamer Schritt",
      minutes: 5,
      questions: [
        "Welches kleine Projekt könnten wir zwei Wochen lang gemeinsam ausprobieren?",
        "Woran würden wir beide erkennen, dass die Zusammenarbeit funktioniert?",
      ],
    },
  ];
}

function investorSections(profile: Profile, user: UserContext | null | undefined): InterviewGuideSection[] {
  const idea = ideaSnippet(user);
  return [
    {
      title: "Motivation & gemeinsame Richtung",
      minutes: 5,
      questions: [
        "Welche Investment-Thesis verfolgst du gerade, und was müsste ein Team mitbringen, damit du hinschaust?",
        idea ? `Ich arbeite an: „${idea}“ – passt das grob in dein Raster, und wenn nein, warum nicht?` : "Welche Art Gründer:innen suchst du aktuell?",
      ],
    },
    {
      title: "Erfahrung an einem konkreten Beispiel",
      minutes: 10,
      questions: [
        experienceQuestion(profile, "Welches Investment beschreibt am besten, wie du mit Gründer:innen arbeitest?"),
        "Bei welchem Investment lief es nicht wie geplant, und was hast du daraus für deine Rolle als Investor:in gelernt?",
      ],
    },
    {
      title: "Zusammenarbeit & Rahmenbedingungen",
      minutes: 10,
      questions: [
        "In welcher Phase und mit welcher Ticketgröße steigst du üblicherweise ein?",
        "Wie läuft dein Prozess von Erstgespräch bis Zusage, und wie lange dauert er realistisch?",
        "Was erwartest du nach dem Investment an Reporting, Mitsprache und Kontakt?",
      ],
    },
    {
      title: "Nächster gemeinsamer Schritt",
      minutes: 5,
      questions: [
        "Was müsste ich dir als Nächstes zeigen, damit ein zweites Gespräch Sinn ergibt?",
        "Wen aus deinem Netzwerk sollte ich unabhängig davon kennenlernen?",
      ],
    },
  ];
}

function mentorSections(profile: Profile, user: UserContext | null | undefined): InterviewGuideSection[] {
  const idea = ideaSnippet(user);
  return [
    {
      title: "Motivation & gemeinsame Richtung",
      minutes: 5,
      questions: [
        "Warum begleitest du Gründer:innen, und was hast du selbst davon?",
        idea ? `Ich arbeite an: „${idea}“ – wo würdest du als Erstes genauer hinschauen?` : "Bei welchen Themen bist du am hilfreichsten?",
      ],
    },
    {
      title: "Erfahrung an einem konkreten Beispiel",
      minutes: 10,
      questions: [
        experienceQuestion(profile, "Welche Erfahrung aus deiner Laufbahn ist für Gründer:innen in meiner Phase am wertvollsten?"),
        "Erzähl von einem Team, das du begleitet hast: Was hat funktioniert, was nicht?",
      ],
    },
    {
      title: "Zusammenarbeit & Rahmenbedingungen",
      minutes: 10,
      questions: [
        "Welches Format passt dir: regelmäßige Calls, Ad-hoc-Fragen oder punktuelle Sessions?",
        "Wie viel Zeit kannst du realistisch geben, und wo liegen deine Grenzen?",
        "Erwartest du eine Gegenleistung, etwa Advisor-Anteile, und wie handhabst du das üblicherweise?",
      ],
    },
    {
      title: "Nächster gemeinsamer Schritt",
      minutes: 5,
      questions: [
        "Welche eine Frage sollten wir beim nächsten Mal konkret bearbeiten?",
        "Woran würden wir beide merken, dass das Mentoring etwas bringt?",
      ],
    },
  ];
}

function talentSections(profile: Profile, user: UserContext | null | undefined): InterviewGuideSection[] {
  const idea = ideaSnippet(user);
  return [
    {
      title: "Motivation & gemeinsame Richtung",
      minutes: 5,
      questions: [
        "Was reizt dich an einem frühen Startup mehr als an einer etablierten Firma?",
        idea ? `Ich arbeite an: „${idea}“ – was daran findest du spannend, was fehlt dir?` : "Welche Art Produkt oder Problem willst du als Nächstes bearbeiten?",
      ],
    },
    {
      title: "Erfahrung an einem konkreten Beispiel",
      minutes: 10,
      questions: [
        experienceQuestion(profile, "Welches Projekt zeigt am besten, was du eigenständig liefern kannst?"),
        "Wo hattest du zuletzt zu wenig Struktur oder zu wenig Freiheit, und wie bist du damit umgegangen?",
      ],
    },
    {
      title: "Zusammenarbeit & Rahmenbedingungen",
      minutes: 10,
      questions: [
        "Welche Rolle stellst du dir vor: erste:r Mitarbeiter:in, Lead oder eher Co-Founder-nah?",
        "Ab wann könntest du starten, und in welchem Umfang – Vollzeit, Teilzeit, remote oder vor Ort?",
        "Wie wichtig sind dir Gehalt, Equity und Jobsicherheit im Verhältnis zueinander?",
      ],
    },
    {
      title: "Nächster gemeinsamer Schritt",
      minutes: 5,
      questions: [
        "Welche kleine Aufgabe könnten wir als Probelauf gemeinsam angehen?",
        "Was brauchst du von mir, um eine Entscheidung treffen zu können?",
      ],
    },
  ];
}

function expertSections(profile: Profile, user: UserContext | null | undefined): InterviewGuideSection[] {
  const idea = ideaSnippet(user);
  return [
    {
      title: "Motivation & gemeinsame Richtung",
      minutes: 5,
      questions: [
        "Welche Fragen bekommst du von Gründer:innen am häufigsten, und welche findest du selbst am spannendsten?",
        idea ? `Ich arbeite an: „${idea}“ – wo siehst du das größte fachliche Risiko?` : "In welchem Bereich bist du wirklich tief drin?",
      ],
    },
    {
      title: "Erfahrung an einem konkreten Beispiel",
      minutes: 10,
      questions: [
        experienceQuestion(profile, "Welche Erfahrung aus deiner Laufbahn ist für mein Problem am relevantesten?"),
        "Wo hast du gesehen, dass Gründer:innen an genau diesem Thema gescheitert sind, und warum?",
      ],
    },
    {
      title: "Zusammenarbeit & Rahmenbedingungen",
      minutes: 10,
      questions: [
        "In welcher Form könntest du dir Unterstützung vorstellen: einmaliger Rat, Advisor-Rolle oder Projekt?",
        "Wie viel Zeit ist realistisch, und was erwartest du dafür?",
        "Gibt es Interessenkonflikte, etwa durch andere Mandate oder Beteiligungen?",
      ],
    },
    {
      title: "Nächster gemeinsamer Schritt",
      minutes: 5,
      questions: [
        "Welche konkrete Frage könnten wir in einer ersten Session bearbeiten?",
        "Wen sollte ich zu dem Thema außerdem kennenlernen?",
      ],
    },
  ];
}

const UNKNOWNS_BY_ROLE: Record<NetworkRole, string[]> = {
  cofounder: ["Gründungsinteresse", "Verfügbarkeit", "Arbeitsweise", "Erwartungen an Anteile"],
  investor: ["Aktueller Fonds-Status", "Ticketgröße", "Entscheidungsprozess", "Zeitliche Verfügbarkeit"],
  mentor: ["Verfügbarkeit", "Erwartete Gegenleistung", "Bevorzugtes Format", "Aktuelle Auslastung"],
  talent: ["Wechselbereitschaft", "Starttermin", "Gehalts- und Equity-Erwartung", "Remote oder vor Ort"],
  expert: ["Verfügbarkeit", "Honorar- oder Advisor-Erwartung", "Interessenkonflikte", "Tiefe im konkreten Thema"],
};

const SECTIONS_BY_ROLE: Record<
  NetworkRole,
  (profile: Profile, user: UserContext | null | undefined) => InterviewGuideSection[]
> = {
  cofounder: cofounderSections,
  investor: investorSections,
  mentor: mentorSections,
  talent: talentSections,
  expert: expertSections,
};

/**
 * Baut den Leitfaden für ein Profil. `userContext` darf null sein (dann generische Fragen).
 * Der Leitfaden behauptet nichts, was nicht im Profil steht – Unbekanntes landet in `unknowns`.
 */
export function buildInterviewGuide(profile: Profile, userContext?: UserContext | null): InterviewGuide {
  const role: NetworkRole = profile.networkRole in SECTIONS_BY_ROLE ? profile.networkRole : "cofounder";
  const sections = SECTIONS_BY_ROLE[role](profile, userContext);
  const unknowns = UNKNOWNS_BY_ROLE[role].map((x) => `${x}: im Gespräch klären, nicht aus dem Profil ableiten.`);
  if (!profile.experience?.length) {
    unknowns.unshift("Berufliche Stationen: im Profil fehlen Angaben – nach dem Werdegang fragen.");
  }
  return {
    profileId: profile.id,
    name: profile.name,
    title: TITLE_BY_ROLE[role](profile.name),
    duration: DURATION,
    sections,
    unknowns,
  };
}

/** Markdown-Export (für den Download-Button, wie in Voya). */
export function interviewGuideToMarkdown(guide: InterviewGuide): string {
  const lines: string[] = [`# ${guide.title}`, "", `Dauer: ${guide.duration}`, ""];
  for (const section of guide.sections) {
    lines.push(`## ${section.title} (${section.minutes} min)`, "");
    for (const q of section.questions) lines.push(`- ${q}`);
    lines.push("");
  }
  if (guide.unknowns.length > 0) {
    lines.push("## Im Gespräch klären", "");
    for (const u of guide.unknowns) lines.push(`- ${u}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Vorlesbare Kurzfassung für den Voice-Agenten (kein Markdown). */
export function summarizeInterviewGuide(guide: InterviewGuide): string {
  const parts = guide.sections.map((s) => `${s.title} (${s.minutes} Minuten): ${s.questions[0]}`);
  return `${guide.title}, ${guide.duration}. ${parts.join(" ")} Offen bleibt: ${guide.unknowns
    .map((u) => u.split(":")[0])
    .join(", ")}.`;
}

/** Dateiname für den Download, z. B. `interview-lena-hoffmann.md`. */
export function interviewGuideFilename(guide: InterviewGuide): string {
  const slug = guide.profileId.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "leitfaden";
  return `interview-${slug}.md`;
}

/** Browser-Helfer: lädt `content` als Markdown-Datei herunter. Serverseitig (und unter node --test) ein No-op. */
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
