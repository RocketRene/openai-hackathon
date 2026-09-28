"use client";

import { Badge, Button, Kicker, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { useUserContext } from "@/lib/user-context";
import { FOUNDER_ROLE_LABELS, FOUNDER_ROLE_SHORT, NETWORK_ROLE_LABELS, STAGE_LABELS, formatVertical, joinDe } from "./shared";

const MAX_VERTICALS = 3;

/**
 * Hero des Cockpits: Begrüßung mit Name/Rolle und Kontext-Chips – oder, ohne Kontext,
 * der Einstieg über Onboarding, Agent-Interview oder Demo-Kontext.
 */
export default function DashboardHero() {
  const { userContext, ready, loadDemo } = useUserContext();

  if (!ready) {
    return (
      <div className="mb-8" aria-busy="true" aria-live="polite">
        <Kicker>Voya</Kicker>
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[28rem] max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
    );
  }

  if (!userContext) {
    return (
      <PageHeader
        kicker="Voya"
        title="Finde die richtigen Menschen für dein Start-up"
        subtitle="Voya priorisiert Co-Founder, Investor:innen, Mentor:innen und Talente aus IdeaLab 2026 und weiteren Events für dich. Sag uns kurz, wer du bist und wen du suchst."
        action={
          <>
            <LinkButton href="/onboarding">Onboarding starten</LinkButton>
            <LinkButton href="/assistant" variant="secondary">
              ◉ Agent-Interview
            </LinkButton>
            <Button variant="ghost" onClick={loadDemo}>
              Demo-Kontext laden
            </Button>
          </>
        }
      />
    );
  }

  const name = userContext.name.trim() || "Founder";
  const roleLabel = userContext.founderRole ? FOUNDER_ROLE_LABELS[userContext.founderRole] : "Gründer:in";
  const lookingFor = joinDe(userContext.lookingFor.map((r) => NETWORK_ROLE_LABELS[r])) || "passende Kontakte";
  const missingRoles = userContext.lookingForRoles.map((r) => FOUNDER_ROLE_SHORT[r]);
  const verticals = userContext.verticals.slice(0, MAX_VERTICALS);
  const moreVerticals = userContext.verticals.length - verticals.length;

  const subtitle =
    `Du bist ${roleLabel} und suchst ${lookingFor}` +
    (missingRoles.length > 0 ? ` – vor allem mit Fokus auf ${joinDe(missingRoles)}` : "") +
    ". Unten findest du deine Top-Matches aus IdeaLab 2026 und weiteren Events.";

  return (
    <div className="fr-fade-in">
      <PageHeader
        kicker="Voya"
        title={`Willkommen zurück, ${name}`}
        subtitle={subtitle}
        action={
          <>
            <LinkButton href="/candidates">Kandidaten durchsuchen</LinkButton>
            <LinkButton href="/onboarding" variant="secondary">
              Kontext bearbeiten
            </LinkButton>
          </>
        }
      />

      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-1.5" aria-label="Dein Kontext">
        <Badge tone="accent">{roleLabel}</Badge>
        {userContext.stage && <Badge>Phase: {STAGE_LABELS[userContext.stage]}</Badge>}
        {verticals.map((v) => (
          <Badge key={v}>{formatVertical(v)}</Badge>
        ))}
        {moreVerticals > 0 && <Badge>+{moreVerticals}</Badge>}
        {userContext.openToIdeas && <Badge>Offen für Ideen</Badge>}
        {userContext.completedInterview && <Badge tone="success">Interview abgeschlossen</Badge>}
      </div>
    </div>
  );
}
