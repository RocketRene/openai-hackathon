"use client";

import { Badge, Button, Kicker, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { COMMON, useLocale, useT, type Dict } from "@/lib/i18n";
import { useUserContext } from "@/lib/user-context";
import { FOUNDER_ROLE_LABELS, FOUNDER_ROLE_SHORT, NETWORK_ROLE_LABELS, STAGE_LABELS, formatVertical, joinList } from "./shared";

const MAX_VERTICALS = 3;

const DICT = {
  title: { de: "Finde die richtigen Menschen für dein Start-up", en: "Find the right people for your start-up" },
  intro: {
    de: "Voya priorisiert Co-Founder, Investor:innen, Mentor:innen und Talente aus IdeaLab 2026 und weiteren Events für dich. Sag uns kurz, wer du bist und wen du suchst.",
    en: "Voya ranks co-founders, investors, mentors and talent from IdeaLab 2026 and other events for you. Tell us briefly who you are and who you're looking for.",
  },
  startOnboarding: { de: "Onboarding starten", en: "Start onboarding" },
  agentInterview: { de: "◉ Agent-Interview", en: "◉ Agent interview" },
  welcome: { de: "Willkommen zurück, {name}", en: "Welcome back, {name}" },
  roleFallback: { de: "Gründer:in", en: "Founder" },
  contactsFallback: { de: "passende Kontakte", en: "the right contacts" },
  subtitle: {
    de: "Du bist {role} und suchst {lookingFor}{focus}. Unten findest du deine Top-Matches aus IdeaLab 2026 und weiteren Events.",
    en: "You're {article} {role} looking for {lookingFor}{focus}. Your top matches from IdeaLab 2026 and other events are below.",
  },
  focus: { de: " – vor allem mit Fokus auf {roles}", en: " – with a focus on {roles}" },
  browse: { de: "Kandidaten durchsuchen", en: "Browse candidates" },
  editContext: { de: "Kontext bearbeiten", en: "Edit context" },
  yourContext: { de: "Dein Kontext", en: "Your context" },
  stage: { de: "Phase: {stage}", en: "Stage: {stage}" },
  openToIdeas: { de: "Offen für Ideen", en: "Open to ideas" },
  interviewDone: { de: "Interview abgeschlossen", en: "Interview completed" },
} satisfies Dict;

/**
 * Hero des Cockpits: Begrüßung mit Name/Rolle und Kontext-Chips – oder, ohne Kontext,
 * der Einstieg über Onboarding, Agent-Interview oder Demo-Kontext.
 */
export default function DashboardHero() {
  const { userContext, ready, loadDemo } = useUserContext();
  const [locale] = useLocale();
  const t = useT(DICT);
  const tc = useT(COMMON);
  const tRole = useT(FOUNDER_ROLE_LABELS);
  const tRoleShort = useT(FOUNDER_ROLE_SHORT);
  const tNetwork = useT(NETWORK_ROLE_LABELS);
  const tStage = useT(STAGE_LABELS);

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
        title={t("title")}
        subtitle={t("intro")}
        action={
          <>
            <LinkButton href="/onboarding">{t("startOnboarding")}</LinkButton>
            <LinkButton href="/assistant" variant="secondary">
              {t("agentInterview")}
            </LinkButton>
            <Button variant="ghost" onClick={loadDemo}>
              {tc("loadDemo")}
            </Button>
          </>
        }
      />
    );
  }

  const name = userContext.name.trim() || "Founder";
  const roleLabel = userContext.founderRole ? tRole(userContext.founderRole) : t("roleFallback");
  const lookingFor = joinList(userContext.lookingFor.map((r) => tNetwork(r)), locale) || t("contactsFallback");
  const missingRoles = userContext.lookingForRoles.map((r) => tRoleShort(r));
  const verticals = userContext.verticals.slice(0, MAX_VERTICALS);
  const moreVerticals = userContext.verticals.length - verticals.length;

  // Im englischen Satz klein („a tech founder“, „an operations founder“); im Badge bleibt die Großschreibung.
  const roleInSentence = locale === "en" ? roleLabel.charAt(0).toLowerCase() + roleLabel.slice(1) : roleLabel;
  const article = /^[aeiou]/i.test(roleInSentence) ? "an" : "a";
  const subtitle = t("subtitle", {
    article,
    role: roleInSentence,
    lookingFor,
    focus: missingRoles.length > 0 ? t("focus", { roles: joinList(missingRoles, locale) }) : "",
  });

  return (
    <div className="fr-fade-in">
      <PageHeader
        kicker="Voya"
        title={t("welcome", { name })}
        subtitle={subtitle}
        action={
          <>
            <LinkButton href="/candidates">{t("browse")}</LinkButton>
            <LinkButton href="/onboarding" variant="secondary">
              {t("editContext")}
            </LinkButton>
          </>
        }
      />

      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-1.5" aria-label={t("yourContext")}>
        <Badge tone="accent">{roleLabel}</Badge>
        {userContext.stage && <Badge>{t("stage", { stage: tStage(userContext.stage) })}</Badge>}
        {verticals.map((v) => (
          <Badge key={v}>{formatVertical(v)}</Badge>
        ))}
        {moreVerticals > 0 && <Badge>+{moreVerticals}</Badge>}
        {userContext.openToIdeas && <Badge>{t("openToIdeas")}</Badge>}
        {userContext.completedInterview && <Badge tone="success">{t("interviewDone")}</Badge>}
      </div>
    </div>
  );
}
