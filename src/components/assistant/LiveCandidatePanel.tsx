"use client";
/**
 * Live-Panel „Gerade im Gespräch“ (Voya): zeigt die Profile, die der Agent gerade "auf den Tisch legt"
 * (Transkript: "guck dir mal den Max an" → Max erscheint groß mit Foto, Headline und LinkedIn-Link).
 * Die zuletzt gezeigte Person steht groß oben, weitere Profile als kompakte Liste (Klick holt sie nach vorn).
 * Daten ausschließlich über das Gateway (getProfile / getEvent).
 *
 * Sprache (DE/EN): UI-Texte über das lokale DICT, Rollen-Labels über COMMON. Datenfelder
 * (Namen, Headlines, Profil-Texte) bleiben, wie sie sind.
 */
import { useState, type ReactNode } from "react";
import { getEvent, getProfile } from "@/lib/data";
import { COMMON, useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
import { PERSONALITY_LABELS, type Experience, type PersonalityType, type Profile, type Stage } from "@/lib/types";
import { Avatar, Badge, Card, EmptyState, Kicker, LinkButton, cx } from "@/components/ui";

export interface LiveCandidatePanelProps {
  /** Profil-IDs, neueste zuerst – die erste ist „Gerade im Gespräch“. */
  profileIds: string[];
  /** Klick auf ein kompaktes Profil → nach vorn holen. */
  onFocus?: (id: string) => void;
}

const DICT = {
  emptyTitle: { de: "Noch niemand im Gespräch", en: "Nobody in focus yet" },
  emptyBody: {
    de: "Sag Voya z. B. „Guck dir mal den Max an“ oder „Suche ML-Engineer in Berlin“ – dann erscheint hier das Profil mit Foto, Headline und LinkedIn.",
    en: "Tell Voya e.g. “Show me Max” or “Search for ML engineers in Berlin” – the profile then appears here with photo, headline and LinkedIn.",
  },
  currentlyDiscussing: { de: "Gerade im Gespräch", en: "Currently discussing" },
  othersTitle: { de: "Weitere im Blick", en: "Also in view" },
  othersDesc: { de: "Zuletzt gezeigte Profile – anklicken, um sie nach vorn zu holen.", en: "Recently shown profiles – click to bring one to the front." },
  notFound: { de: "nicht gefunden.", en: "not found." },
  profile: { de: "Profil", en: "Profile" },
  profileNotFound: { de: "wurde nicht gefunden.", en: "was not found." },
  headlineMissing: { de: "Berufliche Angaben noch offen", en: "Professional details still open" },
  locationMissing: { de: "Standort nicht angegeben", en: "Location not specified" },
  linkedin: { de: "LinkedIn-Profil ↗", en: "LinkedIn profile ↗" },
  noLinkedin: { de: " · Kein LinkedIn-Link vorhanden", en: " · No LinkedIn link available" },
  asOf: { de: "Stand: {date}", en: "As of: {date}" },
  seeks: { de: "Sucht:", en: "Looking for:" },
  experience: { de: "Berufliche Stationen", en: "Professional experience" },
  positionMissing: { de: "Position offen", en: "Position open" },
  today: { de: "heute", en: "today" },
  showLess: { de: "Weniger anzeigen", en: "Show less" },
  showMore: { de: "Mehr anzeigen", en: "Show more" },
  moreStations: { de: "+{n} weitere Stationen", en: "+{n} more positions" },
  noExperience: { de: "Keine beruflichen Stationen hinterlegt.", en: "No professional experience on file." },
  about: { de: "Über", en: "About" },
  skills: { de: "Skills", en: "Skills" },
  less: { de: "weniger", en: "less" },
  languages: { de: "Sprachen: {list}", en: "Languages: {list}" },
  education: { de: "Ausbildung", en: "Education" },
  personality: { de: "Persönlichkeit · {type}", en: "Personality · {type}" },
  approach: { de: "So ansprechen:", en: "How to approach:" },
  hideTips: { de: "Tipps ausblenden", en: "Hide tips" },
  showTips: { de: "Outreach-Tipps anzeigen", en: "Show outreach tips" },
  do: { de: "Do", en: "Do" },
  avoid: { de: "Besser vermeiden", en: "Better avoid" },
  notInProfile: {
    de: "Verfügbarkeit und Gründungsinteresse stehen nicht im Profil – das klärt ihr im Gespräch.",
    en: "Availability and interest in founding aren't in the profile – that's for the conversation.",
  },
  open: { de: "Öffnen", en: "Open" },
  bringToFront: { de: "{name} nach vorn holen", en: "Bring {name} to the front" },
  // Quellen
  sourceLinkedin: { de: "LinkedIn + IdeaLab", en: "LinkedIn + IdeaLab" },
  sourceConference: { de: "IdeaLab", en: "IdeaLab" },
  sourceMock: { de: "Demo", en: "Demo" },
  sourceManual: { de: "Manuell", en: "Manual" },
  sourceUnknown: { de: "Quelle unbekannt", en: "Unknown source" },
  // Stages
  stage_idea: { de: "Idee", en: "Idea" },
  "stage_pre-seed": { de: "Pre-Seed", en: "Pre-seed" },
  stage_seed: { de: "Seed", en: "Seed" },
  "stage_series-a": { de: "Series A", en: "Series A" },
  stage_growth: { de: "Growth", en: "Growth" },
} satisfies Dict;

type DictKey = keyof typeof DICT;

const STAGE_KEYS: Record<Stage, DictKey> = {
  idea: "stage_idea",
  "pre-seed": "stage_pre-seed",
  seed: "stage_seed",
  "series-a": "stage_series-a",
  growth: "stage_growth",
};

/** PERSONALITY_LABELS (types.ts) sind deutsch – englische Gegenstücke lokal. */
const PERSONALITY_EN: Record<PersonalityType, string> = {
  visionary: "Visionary",
  builder: "Builder",
  operator: "Operator",
  connector: "Connector",
  analyst: "Analyst",
};

function personalityLabel(type: PersonalityType, locale: Locale): string {
  return locale === "en" ? PERSONALITY_EN[type] ?? type : PERSONALITY_LABELS[type] ?? type;
}

/** Quellen-Transparenz (Voya): woher die Daten stammen und wie alt sie sind. */
function sourceMeta(source: Profile["source"]): { label: DictKey; tone: "neutral" | "accent" | "success" | "warning" } {
  switch (source?.type) {
    case "linkedin":
      return { label: "sourceLinkedin", tone: "accent" };
    case "conference":
      return { label: "sourceConference", tone: "success" };
    case "mock":
      return { label: "sourceMock", tone: "warning" };
    case "manual":
      return { label: "sourceManual", tone: "neutral" };
    default:
      return { label: "sourceUnknown", tone: "neutral" };
  }
}

function formatScrapedAt(iso: string | undefined, locale: Locale): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ABOUT_PREVIEW_CHARS = 220;
const EXPERIENCE_PREVIEW = 3;
const SKILLS_PREVIEW = 10;

export default function LiveCandidatePanel({ profileIds, onFocus }: LiveCandidatePanelProps) {
  const t = useT(DICT);
  const [currentId, ...otherIds] = profileIds;

  if (profileIds.length === 0) {
    return <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />;
  }

  const current = getProfile(currentId);

  return (
    <div className="space-y-4">
      {current ? <CurrentCandidateCard profile={current} /> : <MissingProfileCard id={currentId} />}

      {otherIds.length > 0 && (
        <Card title={t("othersTitle")} description={t("othersDesc")} padding="sm">
          <ul className="divide-y divide-[var(--border)]">
            {otherIds.map((id) => {
              const p = getProfile(id);
              if (!p) {
                return (
                  <li key={id} className="px-1 py-2 text-xs text-[var(--muted)]">
                    {t("profile")} <code className="rounded bg-[var(--surface-2)] px-1">{id}</code> {t("notFound")}
                  </li>
                );
              }
              return <CompactCandidateRow key={id} profile={p} onFocus={onFocus} />;
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function MissingProfileCard({ id }: { id: string }) {
  const t = useT(DICT);
  return (
    <Card>
      <p className="text-sm text-[var(--muted)]">
        {t("profile")} <code className="rounded bg-[var(--surface-2)] px-1 text-xs">{id}</code> {t("profileNotFound")}
      </p>
    </Card>
  );
}

function formatPeriod(exp: Pick<Experience, "start" | "end">, today: string): string {
  const start = exp.start?.trim();
  const end = exp.end?.trim();
  if (!start && !end) return "";
  return `${start || "?"} – ${end || today}`;
}

function isHttpUrl(url?: string): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

/* ------------------------------------------------------------------ */
/* Gerade im Gespräch                                                  */
/* ------------------------------------------------------------------ */

function CurrentCandidateCard({ profile: p }: { profile: Profile }) {
  const t = useT(DICT);
  const tc = useT(COMMON);
  const [locale] = useLocale();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [allExperience, setAllExperience] = useState(false);
  const [allSkills, setAllSkills] = useState(false);
  const [personalityOpen, setPersonalityOpen] = useState(false);

  const aboutTooLong = p.about.length > ABOUT_PREVIEW_CHARS;
  const aboutText = aboutOpen || !aboutTooLong ? p.about : `${p.about.slice(0, ABOUT_PREVIEW_CHARS).trimEnd()} …`;
  const experience = allExperience ? p.experience : p.experience.slice(0, EXPERIENCE_PREVIEW);
  const skills = allSkills ? p.skills : p.skills.slice(0, SKILLS_PREVIEW);
  const events = p.events.map((slug) => getEvent(slug)?.name ?? slug);
  const source = sourceMeta(p.source);
  const scrapedAt = formatScrapedAt(p.source?.scrapedAt, locale);
  const personality = personalityLabel(p.personality.type, locale);
  const today = t("today");

  return (
    <Card className="ring-2 ring-[var(--accent)]/60">
      <Kicker>{t("currentlyDiscussing")}</Kicker>

      {/* Kopf: Foto groß, Name, Headline, Ort, LinkedIn */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <Avatar src={p.photoUrl || undefined} name={p.name} size={96} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{p.name}</h3>
          {p.headline ? (
            <p className="mt-0.5 text-sm text-[var(--foreground)]">{p.headline}</p>
          ) : (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{t("headlineMissing")}</p>
          )}
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {p.location || t("locationMissing")}
            {isHttpUrl(p.linkedinUrl) ? (
              <>
                {" · "}
                <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--accent)] hover:underline">
                  {t("linkedin")}
                </a>
              </>
            ) : (
              t("noLinkedin")
            )}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={source.tone}>{t(source.label)}</Badge>
            {scrapedAt && <span className="text-[11px] text-[var(--muted)]">{t("asOf", { date: scrapedAt })}</span>}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="accent">{tc(p.networkRole)}</Badge>
            {p.founderRole && <Badge>{tc(p.founderRole)}</Badge>}
            <Badge tone="success">{personality}</Badge>
            {p.stage && <Badge>{STAGE_KEYS[p.stage] ? t(STAGE_KEYS[p.stage]) : p.stage}</Badge>}
            {p.verticals.slice(0, 4).map((v) => (
              <Badge key={v}>{v}</Badge>
            ))}
          </div>

          {p.lookingFor.length > 0 && (
            <p className="mt-2 text-sm text-[var(--foreground)]">
              <span className="text-[var(--muted)]">{t("seeks")}</span> {p.lookingFor.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Berufliche Stationen – die konkreten Belege */}
      <Section title={t("experience")}>
        {p.experience.length > 0 ? (
          <>
            <ul className="space-y-2">
              {experience.map((e, i) => (
                <li key={`${e.title}-${e.company}-${i}`} className="text-sm">
                  <p className="font-medium text-[var(--foreground)]">
                    {e.title || t("positionMissing")}
                    {e.company && <span className="font-normal text-[var(--muted)]"> · {e.company}</span>}
                  </p>
                  {formatPeriod(e, today) && <p className="text-xs text-[var(--muted)]">{formatPeriod(e, today)}</p>}
                  {e.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{e.description}</p>}
                </li>
              ))}
            </ul>
            {p.experience.length > EXPERIENCE_PREVIEW && (
              <ToggleLink
                open={allExperience}
                onClick={() => setAllExperience((o) => !o)}
                openLabel={t("showLess")}
                closedLabel={t("moreStations", { n: p.experience.length - EXPERIENCE_PREVIEW })}
              />
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("noExperience")}</p>
        )}
      </Section>

      {/* About */}
      {p.about && (
        <Section title={t("about")}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{aboutText}</p>
          {aboutTooLong && (
            <ToggleLink open={aboutOpen} onClick={() => setAboutOpen((o) => !o)} openLabel={t("showLess")} closedLabel={t("showMore")} />
          )}
        </Section>
      )}

      {/* Skills */}
      {p.skills.length > 0 && (
        <Section title={t("skills")}>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
            {p.skills.length > SKILLS_PREVIEW && (
              <button
                type="button"
                onClick={() => setAllSkills((o) => !o)}
                className="rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs text-[var(--accent)] hover:bg-[var(--surface-2)]"
              >
                {allSkills ? t("less") : `+${p.skills.length - SKILLS_PREVIEW}`}
              </button>
            )}
          </div>
          {p.languages && p.languages.length > 0 && (
            <p className="mt-2 text-xs text-[var(--muted)]">{t("languages", { list: p.languages.join(", ") })}</p>
          )}
        </Section>
      )}

      {/* Ausbildung */}
      {p.education.length > 0 && (
        <Section title={t("education")}>
          <ul className="space-y-1">
            {p.education.slice(0, 3).map((ed, i) => (
              <li key={`${ed.school}-${i}`} className="text-sm">
                <span className="font-medium text-[var(--foreground)]">{ed.school}</span>
                {(ed.degree || ed.field) && <span className="text-xs text-[var(--muted)]"> · {[ed.degree, ed.field].filter(Boolean).join(", ")}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Persönlichkeit – Tipps zusammenklappbar */}
      <Section title={t("personality", { type: personality })}>
        {p.personality.summary && <p className="text-sm text-[var(--foreground)]">{p.personality.summary}</p>}
        {p.personality.communicationStyle && (
          <p className="mt-1.5 text-sm text-[var(--foreground)]">
            <span className="text-[var(--muted)]">{t("approach")}</span> {p.personality.communicationStyle}
          </p>
        )}
        {(p.personality.outreachTips?.length > 0 || p.personality.avoid?.length > 0) && (
          <>
            <ToggleLink
              open={personalityOpen}
              onClick={() => setPersonalityOpen((o) => !o)}
              openLabel={t("hideTips")}
              closedLabel={t("showTips")}
            />
            {personalityOpen && (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {p.personality.outreachTips?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--success)]">{t("do")}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--foreground)]">
                      {p.personality.outreachTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.personality.avoid?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--danger)]">{t("avoid")}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--foreground)]">
                      {p.personality.avoid.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Events */}
      {events.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {events.map((name) => (
            <Badge key={name} tone="warning">
              {name}
            </Badge>
          ))}
        </div>
      )}

      {/* Aktionen */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <LinkButton href={`/candidates/${encodeURIComponent(p.id)}`} size="sm">
          {tc("openProfile")}
        </LinkButton>
        <LinkButton href={`/outreach?profile=${encodeURIComponent(p.id)}`} variant="secondary" size="sm">
          {tc("outreach")}
        </LinkButton>
        <LinkButton href={`/prep/${encodeURIComponent(p.id)}`} variant="secondary" size="sm">
          {tc("prep")}
        </LinkButton>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">{t("notInProfile")}</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Kompakte Liste                                                      */
/* ------------------------------------------------------------------ */

function CompactCandidateRow({ profile: p, onFocus }: { profile: Profile; onFocus?: (id: string) => void }) {
  const t = useT(DICT);
  const tc = useT(COMMON);
  const last = p.experience[0];
  const inner = (
    <>
      <Avatar src={p.photoUrl || undefined} name={p.name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{p.name}</p>
          <Badge tone="accent">{tc(p.networkRole)}</Badge>
          {p.founderRole && <Badge>{tc(p.founderRole)}</Badge>}
        </div>
        <p className="truncate text-xs text-[var(--muted)]" title={p.headline}>
          {p.headline || (last ? `${last.title} · ${last.company}` : t("headlineMissing"))}
        </p>
      </div>
    </>
  );

  return (
    <li className="flex items-center gap-3 px-1 py-2">
      {onFocus ? (
        <button
          type="button"
          onClick={() => onFocus(p.id)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] text-left transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label={t("bringToFront", { name: p.name })}
        >
          {inner}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
      )}
      <LinkButton href={`/candidates/${encodeURIComponent(p.id)}`} variant="ghost" size="sm" className="shrink-0">
        {t("open")}
      </LinkButton>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Kleinteile                                                          */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</h4>
      {children}
    </div>
  );
}

function ToggleLink({ open, onClick, openLabel, closedLabel }: { open: boolean; onClick: () => void; openLabel: string; closedLabel: string }) {
  return (
    <button type="button" onClick={onClick} className={cx("mt-1 text-xs font-medium text-[var(--accent)] hover:underline")}>
      {open ? openLabel : closedLabel}
    </button>
  );
}
