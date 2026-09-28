"use client";
/**
 * Live-Panel „Gerade im Gespräch“: zeigt die Profile, die Voya gerade "auf den Tisch legt"
 * (Transkript: "guck dir mal den Max an" → Max erscheint groß mit Foto, Headline und LinkedIn;
 * weitere Profile als kompakte Liste). Dazu die Leitfaden-Karte aus prepare_interview
 * (show_interview_guide) mit Markdown-Download und Link zur Vorbereitungsseite.
 * Daten ausschließlich über das Gateway (getProfile / getEvent).
 */
import { useState, type ReactNode } from "react";
import { getEvent, getProfile } from "@/lib/data";
import { downloadMarkdown, interviewGuideFilename, interviewGuideToMarkdown } from "@/lib/interview-guide";
import {
  PERSONALITY_LABELS,
  type Experience,
  type FounderRole,
  type InterviewGuide,
  type NetworkRole,
  type Profile,
  type Stage,
} from "@/lib/types";
import { Avatar, Badge, Button, Card, EmptyState, Kicker, LinkButton, cx } from "@/components/ui";

export interface LiveCandidatePanelProps {
  /** Profil-IDs, neueste zuerst – die erste ist „Gerade im Gespräch“. */
  profileIds: string[];
  /** Vom Agenten (prepare_interview) oder lokal erstellter Leitfaden. */
  guide?: InterviewGuide | null;
  /** Klick auf ein kompaktes Profil → nach vorn holen. */
  onFocus?: (id: string) => void;
  /** „Leitfaden erstellen“ ohne Agent (lokal, deterministisch). */
  onRequestGuide?: (id: string) => void;
  onDismissGuide?: () => void;
}

const NETWORK_ROLE_LABELS: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:in",
  mentor: "Mentor:in",
  talent: "Talent",
  expert: "Expert:in",
};

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expert:in",
};

const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idee",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

const ABOUT_PREVIEW_CHARS = 220;
const EXPERIENCE_PREVIEW = 3;
const SKILLS_PREVIEW = 10;

export default function LiveCandidatePanel({ profileIds, guide, onFocus, onRequestGuide, onDismissGuide }: LiveCandidatePanelProps) {
  const [currentId, ...otherIds] = profileIds;
  const current = currentId ? getProfile(currentId) : undefined;

  if (profileIds.length === 0 && !guide) {
    return (
      <EmptyState
        title="Noch niemand im Gespräch"
        body="Sag Voya z. B. „Guck dir mal den Max an“ oder „Suche ML-Engineer in Berlin“ – dann erscheint hier das Profil mit Foto, Headline und LinkedIn."
      />
    );
  }

  return (
    <div className="space-y-4">
      {currentId && (current ? (
        <CurrentCandidateCard
          profile={current}
          hasGuide={guide?.profileId === current.id}
          onRequestGuide={onRequestGuide ? () => onRequestGuide(current.id) : undefined}
        />
      ) : (
        <MissingProfileCard id={currentId} />
      ))}

      {guide && <InterviewGuideCard guide={guide} onDismiss={onDismissGuide} />}

      {otherIds.length > 0 && (
        <Card title="Weitere im Blick" description="Zuletzt gezeigte Profile – anklicken, um sie nach vorn zu holen." padding="sm">
          <ul className="divide-y divide-[var(--border)]">
            {otherIds.map((id) => {
              const p = getProfile(id);
              if (!p) {
                return (
                  <li key={id} className="px-1 py-2 text-xs text-[var(--muted)]">
                    Profil <code className="rounded bg-[var(--surface-2)] px-1">{id}</code> nicht gefunden.
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
  return (
    <Card>
      <p className="text-sm text-[var(--muted)]">
        Profil <code className="rounded bg-[var(--surface-2)] px-1 text-xs">{id}</code> wurde nicht gefunden.
      </p>
    </Card>
  );
}

function formatPeriod(exp: Pick<Experience, "start" | "end">): string {
  const start = exp.start?.trim();
  const end = exp.end?.trim();
  if (!start && !end) return "";
  return `${start || "?"} – ${end || "heute"}`;
}

function isHttpUrl(url?: string): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

/* ------------------------------------------------------------------ */
/* Gerade im Gespräch                                                  */
/* ------------------------------------------------------------------ */

function CurrentCandidateCard({
  profile: p,
  hasGuide,
  onRequestGuide,
}: {
  profile: Profile;
  hasGuide: boolean;
  onRequestGuide?: () => void;
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [allExperience, setAllExperience] = useState(false);
  const [allSkills, setAllSkills] = useState(false);
  const [personalityOpen, setPersonalityOpen] = useState(false);

  const aboutTooLong = p.about.length > ABOUT_PREVIEW_CHARS;
  const aboutText = aboutOpen || !aboutTooLong ? p.about : `${p.about.slice(0, ABOUT_PREVIEW_CHARS).trimEnd()} …`;
  const experience = allExperience ? p.experience : p.experience.slice(0, EXPERIENCE_PREVIEW);
  const skills = allSkills ? p.skills : p.skills.slice(0, SKILLS_PREVIEW);
  const events = p.events.map((slug) => getEvent(slug)?.name ?? slug);

  return (
    <Card className="ring-2 ring-[var(--accent)]/60">
      <Kicker>Gerade im Gespräch</Kicker>

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
            <p className="mt-0.5 text-sm text-[var(--muted)]">Berufliche Angaben noch offen</p>
          )}
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {p.location || "Standort nicht angegeben"}
            {isHttpUrl(p.linkedinUrl) ? (
              <>
                {" · "}
                <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--accent)] hover:underline">
                  LinkedIn-Profil ↗
                </a>
              </>
            ) : (
              " · Kein LinkedIn-Link vorhanden"
            )}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="accent">{NETWORK_ROLE_LABELS[p.networkRole] ?? p.networkRole}</Badge>
            {p.founderRole && <Badge>{FOUNDER_ROLE_LABELS[p.founderRole] ?? p.founderRole}</Badge>}
            <Badge tone="success">{PERSONALITY_LABELS[p.personality.type] ?? p.personality.type}</Badge>
            {p.stage && <Badge>{STAGE_LABELS[p.stage] ?? p.stage}</Badge>}
            {p.verticals.slice(0, 4).map((v) => (
              <Badge key={v}>{v}</Badge>
            ))}
          </div>

          {p.lookingFor.length > 0 && (
            <p className="mt-2 text-sm text-[var(--foreground)]">
              <span className="text-[var(--muted)]">Sucht:</span> {p.lookingFor.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Erfahrung – die konkreten Belege */}
      {p.experience.length > 0 ? (
        <Section title="Berufliche Stationen">
          <ul className="space-y-2">
            {experience.map((e, i) => (
              <li key={`${e.title}-${e.company}-${i}`} className="text-sm">
                <p className="font-medium text-[var(--foreground)]">
                  {e.title || "Position offen"}
                  {e.company && <span className="font-normal text-[var(--muted)]"> · {e.company}</span>}
                </p>
                {formatPeriod(e) && <p className="text-xs text-[var(--muted)]">{formatPeriod(e)}</p>}
                {e.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{e.description}</p>}
              </li>
            ))}
          </ul>
          {p.experience.length > EXPERIENCE_PREVIEW && (
            <ToggleLink
              open={allExperience}
              onClick={() => setAllExperience((o) => !o)}
              openLabel="Weniger anzeigen"
              closedLabel={`+${p.experience.length - EXPERIENCE_PREVIEW} weitere Stationen`}
            />
          )}
        </Section>
      ) : (
        <Section title="Berufliche Stationen">
          <p className="text-sm text-[var(--muted)]">Keine beruflichen Stationen hinterlegt.</p>
        </Section>
      )}

      {/* About */}
      {p.about && (
        <Section title="Über">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{aboutText}</p>
          {aboutTooLong && (
            <ToggleLink open={aboutOpen} onClick={() => setAboutOpen((o) => !o)} openLabel="Weniger anzeigen" closedLabel="Mehr anzeigen" />
          )}
        </Section>
      )}

      {/* Skills */}
      {p.skills.length > 0 && (
        <Section title="Skills">
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
                {allSkills ? "weniger" : `+${p.skills.length - SKILLS_PREVIEW}`}
              </button>
            )}
          </div>
          {p.languages && p.languages.length > 0 && (
            <p className="mt-2 text-xs text-[var(--muted)]">Sprachen: {p.languages.join(", ")}</p>
          )}
        </Section>
      )}

      {/* Ausbildung */}
      {p.education.length > 0 && (
        <Section title="Ausbildung">
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

      {/* Persönlichkeit – zusammenklappbar */}
      <Section title={`Persönlichkeit · ${PERSONALITY_LABELS[p.personality.type] ?? p.personality.type}`}>
        {p.personality.summary && <p className="text-sm text-[var(--foreground)]">{p.personality.summary}</p>}
        {p.personality.communicationStyle && (
          <p className="mt-1.5 text-sm text-[var(--foreground)]">
            <span className="text-[var(--muted)]">So ansprechen:</span> {p.personality.communicationStyle}
          </p>
        )}
        {(p.personality.outreachTips?.length > 0 || p.personality.avoid?.length > 0) && (
          <>
            <ToggleLink
              open={personalityOpen}
              onClick={() => setPersonalityOpen((o) => !o)}
              openLabel="Tipps ausblenden"
              closedLabel="Outreach-Tipps anzeigen"
            />
            {personalityOpen && (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {p.personality.outreachTips?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--success)]">Do</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--foreground)]">
                      {p.personality.outreachTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.personality.avoid?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--danger)]">Besser vermeiden</p>
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
          Profil öffnen
        </LinkButton>
        <LinkButton href={`/outreach?profile=${encodeURIComponent(p.id)}`} variant="secondary" size="sm">
          Outreach
        </LinkButton>
        <LinkButton href={`/prep/${encodeURIComponent(p.id)}`} variant="secondary" size="sm">
          Gespräch vorbereiten
        </LinkButton>
        {onRequestGuide && !hasGuide && (
          <Button variant="outline" size="sm" onClick={onRequestGuide}>
            Leitfaden erstellen
          </Button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        Verfügbarkeit und Gründungsinteresse stehen nicht im Profil – das klärt ihr im Gespräch.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Kompakte Liste                                                      */
/* ------------------------------------------------------------------ */

function CompactCandidateRow({ profile: p, onFocus }: { profile: Profile; onFocus?: (id: string) => void }) {
  const last = p.experience[0];
  const inner = (
    <>
      <Avatar src={p.photoUrl || undefined} name={p.name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{p.name}</p>
          <Badge tone="accent">{NETWORK_ROLE_LABELS[p.networkRole] ?? p.networkRole}</Badge>
          {p.founderRole && <Badge>{FOUNDER_ROLE_LABELS[p.founderRole] ?? p.founderRole}</Badge>}
        </div>
        <p className="truncate text-xs text-[var(--muted)]" title={p.headline}>
          {p.headline || (last ? `${last.title} · ${last.company}` : "Berufliche Angaben noch offen")}
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
          aria-label={`${p.name} nach vorn holen`}
        >
          {inner}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
      )}
      <LinkButton href={`/candidates/${encodeURIComponent(p.id)}`} variant="ghost" size="sm" className="shrink-0">
        Öffnen
      </LinkButton>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Leitfaden-Karte                                                     */
/* ------------------------------------------------------------------ */

export function InterviewGuideCard({ guide, onDismiss }: { guide: InterviewGuide; onDismiss?: () => void }) {
  const profile = getProfile(guide.profileId);

  return (
    <Card
      title={guide.title}
      description={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{guide.duration}</Badge>
          <span>Belegbarer Leitfaden aus Profil und Suchprofil – keine erfundenen Fakten.</span>
        </span>
      }
      action={
        onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Leitfaden ausblenden">
            ✕
          </Button>
        )
      }
    >
      {profile && (
        <div className="mb-4 flex items-center gap-3">
          <Avatar src={profile.photoUrl || undefined} name={profile.name} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{profile.name}</p>
            <p className="truncate text-xs text-[var(--muted)]">{profile.headline}</p>
          </div>
        </div>
      )}

      <ol className="space-y-4">
        {guide.sections.map((s, i) => (
          <li key={s.title}>
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                <span className="mr-1.5 text-[var(--muted)]">{i + 1}.</span>
                {s.title}
              </h4>
              <Badge tone="neutral">{s.minutes} Min.</Badge>
            </div>
            <ul className="mt-1.5 space-y-1 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
              {s.questions.map((q) => (
                <li key={q} className="list-disc">
                  {q}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {guide.unknowns.length > 0 && (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--warning)]">Nicht aus dem Profil ableitbar</p>
          <ul className="mt-1.5 space-y-0.5 pl-5 text-sm text-[var(--foreground)]">
            {guide.unknowns.map((u) => (
              <li key={u} className="list-disc">
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <Button size="sm" onClick={() => downloadMarkdown(interviewGuideFilename(guide), interviewGuideToMarkdown(guide))}>
          Als Markdown herunterladen
        </Button>
        <LinkButton href={`/prep/${encodeURIComponent(guide.profileId)}`} variant="secondary" size="sm">
          Vorbereitung öffnen
        </LinkButton>
      </div>
    </Card>
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

function ToggleLink({
  open,
  onClick,
  openLabel,
  closedLabel,
  className,
}: {
  open: boolean;
  onClick: () => void;
  openLabel: string;
  closedLabel: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cx("mt-1 text-xs font-medium text-[var(--accent)] hover:underline", className)}>
      {open ? openLabel : closedLabel}
    </button>
  );
}
