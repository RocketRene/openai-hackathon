"use client";
/**
 * Live-Kandidaten-Panel: zeigt die Profile, die der Agent gerade "auf den Tisch legt"
 * (Transkript: "guck dir mal den Max an" → Max erscheint mit Foto und allen LinkedIn-Daten).
 * Daten ausschließlich über das Gateway (getProfile / getEvent).
 */
import { useState, type ReactNode } from "react";
import { getEvent, getProfile } from "@/lib/data";
import { PERSONALITY_LABELS, type Experience, type FounderRole, type NetworkRole, type Profile, type Stage } from "@/lib/types";
import { Avatar, Badge, Card, EmptyState, LinkButton, cx } from "@/components/ui";

export interface LiveCandidatePanelProps {
  /** Profil-IDs, neueste zuerst. */
  profileIds: string[];
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
const EXPERIENCE_PREVIEW = 4;
const SKILLS_PREVIEW = 12;

export default function LiveCandidatePanel({ profileIds }: LiveCandidatePanelProps) {
  if (profileIds.length === 0) {
    return (
      <EmptyState
        title="Noch niemand im Blick"
        body="Sag z. B. 'Guck dir mal den Max an' – dann erscheint hier das Profil."
      />
    );
  }

  return (
    <div className="space-y-4">
      {profileIds.map((id, index) => {
        const profile = getProfile(id);
        if (!profile) return <MissingProfileCard key={id} id={id} />;
        return <CandidateDetailCard key={id} profile={profile} highlight={index === 0} />;
      })}
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

function CandidateDetailCard({ profile: p, highlight }: { profile: Profile; highlight: boolean }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [allExperience, setAllExperience] = useState(false);
  const [allSkills, setAllSkills] = useState(false);

  const aboutTooLong = p.about.length > ABOUT_PREVIEW_CHARS;
  const aboutText = aboutOpen || !aboutTooLong ? p.about : `${p.about.slice(0, ABOUT_PREVIEW_CHARS).trimEnd()} …`;
  const experience = allExperience ? p.experience : p.experience.slice(0, EXPERIENCE_PREVIEW);
  const skills = allSkills ? p.skills : p.skills.slice(0, SKILLS_PREVIEW);
  const events = p.events.map((slug) => getEvent(slug)?.name ?? slug);

  return (
    <Card className={cx(highlight && "ring-2 ring-[var(--accent)]")}>
      {/* Kopf: Foto, Name, Headline, Ort */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <Avatar src={p.photoUrl || undefined} name={p.name} size={96} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{p.name}</h3>
            {highlight && <Badge tone="accent">Neu</Badge>}
          </div>
          {p.headline && <p className="mt-0.5 text-sm text-[var(--foreground)]">{p.headline}</p>}
          {p.location && <p className="mt-0.5 text-xs text-[var(--muted)]">{p.location}</p>}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="accent">{NETWORK_ROLE_LABELS[p.networkRole] ?? p.networkRole}</Badge>
            {p.founderRole && <Badge>{FOUNDER_ROLE_LABELS[p.founderRole] ?? p.founderRole}</Badge>}
            <Badge tone="success">{PERSONALITY_LABELS[p.personality.type] ?? p.personality.type}</Badge>
            {p.stage && <Badge>{STAGE_LABELS[p.stage] ?? p.stage}</Badge>}
          </div>

          {p.verticals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.verticals.map((v) => (
                <Badge key={v}>{v}</Badge>
              ))}
            </div>
          )}

          {p.lookingFor.length > 0 && (
            <p className="mt-2 text-sm text-[var(--foreground)]">
              <span className="text-[var(--muted)]">Sucht:</span> {p.lookingFor.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* About */}
      {p.about && (
        <Section title="Über">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{aboutText}</p>
          {aboutTooLong && (
            <ToggleLink open={aboutOpen} onClick={() => setAboutOpen((o) => !o)} openLabel="Weniger anzeigen" closedLabel="Mehr anzeigen" />
          )}
        </Section>
      )}

      {/* Experience */}
      {p.experience.length > 0 && (
        <Section title="Erfahrung">
          <ul className="space-y-2">
            {experience.map((e, i) => (
              <li key={`${e.title}-${e.company}-${i}`} className="text-sm">
                <p className="font-medium text-[var(--foreground)]">
                  {e.title}
                  {e.company && <span className="font-normal text-[var(--muted)]"> @ {e.company}</span>}
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
      )}

      {/* Education */}
      {p.education.length > 0 && (
        <Section title="Ausbildung">
          <ul className="space-y-1.5">
            {p.education.map((ed, i) => (
              <li key={`${ed.school}-${i}`} className="text-sm">
                <p className="font-medium text-[var(--foreground)]">{ed.school}</p>
                {(ed.degree || ed.field) && (
                  <p className="text-xs text-[var(--muted)]">{[ed.degree, ed.field].filter(Boolean).join(" · ")}</p>
                )}
                {(ed.start || ed.end) && <p className="text-xs text-[var(--muted)]">{formatPeriod({ start: ed.start ?? "", end: ed.end })}</p>}
              </li>
            ))}
          </ul>
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

      {/* Persönlichkeit */}
      <Section title={`Persönlichkeit · ${PERSONALITY_LABELS[p.personality.type] ?? p.personality.type}`}>
        {p.personality.summary && <p className="text-sm text-[var(--foreground)]">{p.personality.summary}</p>}
        {p.personality.traits?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.personality.traits.map((t) => (
              <Badge key={t} tone="accent">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {p.personality.communicationStyle && (
          <p className="mt-2 text-sm text-[var(--foreground)]">
            <span className="text-[var(--muted)]">Kommunikation:</span> {p.personality.communicationStyle}
          </p>
        )}
        {p.personality.outreachTips?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-[var(--muted)]">Outreach-Tipps</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--foreground)]">
              {p.personality.outreachTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        {p.personality.avoid?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-[var(--muted)]">Besser vermeiden</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--foreground)]">
              {p.personality.avoid.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Events */}
      {events.length > 0 && (
        <Section title="Events">
          <div className="flex flex-wrap gap-1.5">
            {events.map((name) => (
              <Badge key={name} tone="warning">
                {name}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Links & Aktionen */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <LinkButton href={`/candidates/${encodeURIComponent(p.id)}`}>Profil öffnen</LinkButton>
        <LinkButton href={`/outreach?profile=${encodeURIComponent(p.id)}`} variant="secondary">
          Outreach
        </LinkButton>
        <LinkButton href={`/prep/${encodeURIComponent(p.id)}`} variant="secondary">
          Gespräch vorbereiten
        </LinkButton>
        {isHttpUrl(p.linkedinUrl) && (
          <a
            href={p.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm font-medium text-[var(--accent)] hover:underline"
          >
            LinkedIn öffnen ↗
          </a>
        )}
      </div>
    </Card>
  );
}

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
}: {
  open: boolean;
  onClick: () => void;
  openLabel: string;
  closedLabel: string;
}) {
  return (
    <button type="button" onClick={onClick} className="mt-1 text-xs font-medium text-[var(--accent)] hover:underline">
      {open ? openLabel : closedLabel}
    </button>
  );
}
