"use client";
/**
 * Match-Karte für ein Profil: großer Score in Tier-Farbe, Kurzfazit (explainMatch), Gründe mit
 * Gewicht-Balken, Risiken als Warn-Badges, Komplementarität und die fünf Team-Dimensionen
 * „Ich vs. Person“. Rechnet deterministisch mit scoreMatch() aus dem Nutzer-Kontext (localStorage).
 * Ohne Kontext: EmptyState + „Demo-Kontext laden“, damit die Demo nie leer ist.
 * Zweisprachig (DE/EN): UI-Beschriftungen über lokales DICT; Tier-/Dimensions-Labels als lokale
 * {de,en}-Tabellen. explainMatch() liefert nur Deutsch – auf EN steht stattdessen ein kurzes
 * englisches Fazit (Einstufung + Empfehlung), die Details stehen in der Gründe-Liste.
 */
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { FOUNDER_DIM_KEYS, type FounderDimKey, type Profile } from "@/lib/types";
import { MATCH_TIER_LABELS, explainMatch, matchTier, scoreMatch, type MatchTier } from "@/lib/matching";
import { useUserContext } from "@/lib/user-context";
import { useLocale, useT, type Dict } from "@/lib/i18n";
import { Badge, Button, Card, EmptyState, LinkButton, ScoreBar, ScoreRing, Skeleton, cx } from "@/components/ui";

type Tone = "success" | "accent" | "warning" | "danger";
type Bi = { de: string; en: string };

/** Tier → Ton für Badge/ScoreRing + CSS-Farbtoken für eigene Balken (nur var(--…)). */
const TIER_STYLE: Record<MatchTier, { tone: Tone; color: string }> = {
  top: { tone: "success", color: "var(--success)" },
  gut: { tone: "accent", color: "var(--accent)" },
  möglich: { tone: "warning", color: "var(--warning)" },
  schwach: { tone: "danger", color: "var(--danger)" },
};

/** Tier-Labels: DE direkt aus matching.ts (bleibt synchron), EN lokal. */
const TIER_LABELS: Record<MatchTier, Bi> = {
  top: { de: MATCH_TIER_LABELS.top, en: "Top match" },
  gut: { de: MATCH_TIER_LABELS.gut, en: "Good match" },
  möglich: { de: MATCH_TIER_LABELS.möglich, en: "Possible match" },
  schwach: { de: MATCH_TIER_LABELS.schwach, en: "Weak match" },
};

const DIM_LABELS: Record<FounderDimKey, Bi> = {
  vision: { de: "Vision", en: "Vision" },
  design: { de: "Design / Visuell", en: "Design / Visual" },
  tech: { de: "Technik", en: "Tech" },
  detail: { de: "Detail", en: "Detail" },
  execution: { de: "Umsetzung", en: "Execution" },
};

/** Englisches Pendant zu explainMatch() – nur Einstufung und Empfehlung (Grund-/Risiko-Texte kommen deutsch aus matching.ts). */
const EN_TIER_PHRASE: Record<MatchTier, string> = {
  top: "a top match",
  gut: "a good match",
  möglich: "a possible match",
  schwach: "rather a weak match",
};

const EN_TIER_ADVICE: Record<MatchTier, (first: string) => string> = {
  top: (first) => `Reach out to ${first} directly – ideally right at the event.`,
  gut: () => "A conversation is worth it – clarify the open points early.",
  möglich: () => "Second priority – reach out if time allows.",
  schwach: () => "Probably not the right contact for your current goal.",
};

function explainMatchEn(name: string, score: number, tier: MatchTier) {
  return `${name} is ${EN_TIER_PHRASE[tier]} for you (${score}/100). ${EN_TIER_ADVICE[tier](firstName(name))}`;
}

const DICT: Dict = {
  title: { de: "Match", en: "Match" },
  description: { de: "Passung zu deinem Gründer:innen-Profil", en: "Fit with your founder profile" },
  emptyTitle: { de: "Wir kennen dein Gründer:innen-Profil noch nicht", en: "We don't know your founder profile yet" },
  emptyBody: {
    de: "Lege es im Onboarding an – oder lade den Demo-Kontext, um sofort zu sehen, wie gut {name} zu dir passt.",
    en: "Create it in onboarding – or load the demo context to see right away how well {name} matches you.",
  },
  loadDemo: { de: "Demo-Kontext laden", en: "Load demo context" },
  startOnboarding: { de: "Onboarding starten", en: "Start onboarding" },
  ownDims: { de: "Team-Dimensionen von {name}", en: "{name}'s team dimensions" },
  ownDimsHint: { de: "Skala 0–10, aus Profil und Werdegang abgeleitet.", en: "Scale 0–10, derived from profile and career." },
  of100: { de: "von 100", en: "of 100" },
  reasons: { de: "Warum es passt", en: "Why it fits" },
  noReasons: { de: "Keine klaren Überschneidungen mit deinem Profil gefunden.", en: "No clear overlap with your profile found." },
  risks: { de: "Worauf du achten solltest", en: "What to watch out for" },
  noRisks: { de: "Keine offensichtlichen Risiken.", en: "No obvious risks." },
  complementarity: { de: "Komplementarität", en: "Complementarity" },
  complementarityHint: {
    de: "Wie stark {name} deine schwächeren Team-Dimensionen ergänzt",
    en: "How strongly {name} complements your weaker team dimensions",
  },
  complementarityStronger: { de: " – stärker als du bei {dims}.", en: " – stronger than you in {dims}." },
  dims: { de: "Team-Dimensionen", en: "Team dimensions" },
  me: { de: "Ich", en: "Me" },
  complementsYou: { de: "Ergänzt dich in dieser Dimension", en: "Complements you in this dimension" },
  footer: {
    de: "Regelbasiert berechnet, ohne LLM – nachvollziehbar und ohne API-Key.",
    en: "Rule-based, no LLM – transparent and no API key needed.",
  },
  adjustContext: { de: "Deinen Kontext anpassen", en: "Adjust your context" },
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function clampPct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h4 className={cx("text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]", className)}>{children}</h4>;
}

/** Dünner Balken; Farbe als Token-String, damit auch „Ich“ (muted) möglich ist. */
function ThinBar({ pct, color, size = "md", className }: { pct: number; color: string; size?: "sm" | "md"; className?: string }) {
  return (
    <div className={cx(size === "sm" ? "h-1" : "h-1.5", "w-full overflow-hidden rounded-full bg-[var(--surface-3)]", className)}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="m5.6 5.6 2.1 2.1" />
      <path d="m16.3 16.3 2.1 2.1" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m5.6 18.4 2.1-2.1" />
      <path d="m16.3 7.7 2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Die fünf Dimensionen der Person allein (ohne Nutzer-Kontext). */
function OwnDims({ profile }: { profile: Profile }) {
  const [locale] = useLocale();
  const t = useT(DICT);
  return (
    <div className="mt-6 border-t border-[var(--border)] pt-5">
      <SectionLabel>{t("ownDims", { name: firstName(profile.name) })}</SectionLabel>
      <div className="mt-3 flex flex-col gap-3">
        {FOUNDER_DIM_KEYS.map((key) => (
          <ScoreBar key={key} label={DIM_LABELS[key][locale]} value={profile.dims?.[key] ?? 0} max={10} />
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">{t("ownDimsHint")}</p>
    </div>
  );
}

export default function MatchBreakdown({ profile }: { profile: Profile }) {
  const [locale] = useLocale();
  const t = useT(DICT);
  const { userContext, ready, loadDemo } = useUserContext();
  const match = useMemo(() => (userContext ? scoreMatch(userContext, profile) : null), [userContext, profile]);
  const summary = useMemo(() => {
    if (!userContext || !match) return "";
    if (locale === "en") return explainMatchEn(profile.name, match.score, matchTier(match.score));
    return explainMatch(match, userContext, profile);
  }, [userContext, match, profile, locale]);

  if (!ready) {
    return (
      <Card title={t("title")} description={t("description")}>
        <div className="flex items-center gap-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (!userContext || !match) {
    return (
      <Card title={t("title")} description={t("description")}>
        <EmptyState
          icon={<SparkIcon />}
          title={t("emptyTitle")}
          body={t("emptyBody", { name: firstName(profile.name) })}
          action={
            <>
              <Button size="sm" onClick={loadDemo}>
                {t("loadDemo")}
              </Button>
              <LinkButton href="/onboarding" size="sm" variant="secondary">
                {t("startOnboarding")}
              </LinkButton>
            </>
          }
        />
        <OwnDims profile={profile} />
      </Card>
    );
  }

  const tier = matchTier(match.score);
  const { tone, color } = TIER_STYLE[tier];
  const tierLabel = TIER_LABELS[tier][locale];
  const them = firstName(profile.name);
  const maxWeight = Math.max(1, ...match.reasons.map((r) => r.weight));
  const complementDims = FOUNDER_DIM_KEYS.filter((key) => (profile.dims?.[key] ?? 0) > (userContext.dims?.[key] ?? 0));

  return (
    <Card title={t("title")} description={t("description")} action={<Badge tone={tone}>{tierLabel}</Badge>}>
      {/* Score + Kurzfazit */}
      <div className="flex items-start gap-5">
        <ScoreRing value={match.score} size={96} tone={tone} label={t("of100")} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">{tierLabel}</p>
          {summary && <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{summary}</p>}
        </div>
      </div>

      {/* Gründe */}
      <div className="mt-6">
        <SectionLabel>{t("reasons")}</SectionLabel>
        {match.reasons.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("noReasons")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3.5">
            {match.reasons.map((reason, i) => (
              <li key={`${reason.label}-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">{reason.label}</p>
                  <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color }}>
                    +{reason.weight}
                  </span>
                </div>
                <ThinBar pct={clampPct(reason.weight, maxWeight)} color={color} className="mt-1.5" />
                {reason.detail && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{reason.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Risiken */}
      <div className="mt-6">
        <SectionLabel>{t("risks")}</SectionLabel>
        {match.risks.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("noRisks")}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {match.risks.map((risk, i) => (
              <li key={`${risk}-${i}`} className="max-w-full">
                <Badge tone="warning" className="whitespace-normal py-1 text-left leading-snug">
                  {risk}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Komplementarität */}
      <div className="mt-6 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
        <ScoreBar label={t("complementarity")} value={match.complementarity} />
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
          {t("complementarityHint", { name: them })}
          {complementDims.length > 0 ? t("complementarityStronger", { dims: complementDims.map((k) => DIM_LABELS[k][locale]).join(", ") }) : "."}
        </p>
      </div>

      {/* Dims-Vergleich */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>{t("dims")}</SectionLabel>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]" aria-hidden />
              {t("me")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
              {them}
            </span>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {FOUNDER_DIM_KEYS.map((key) => {
            const mine = userContext.dims?.[key] ?? 0;
            const theirs = profile.dims?.[key] ?? 0;
            const complements = theirs > mine;
            return (
              <li key={key}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium text-[var(--foreground)]">{DIM_LABELS[key][locale]}</span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {mine}
                    <span className="mx-1 opacity-60">·</span>
                    <span className={cx("font-semibold", complements ? "text-[var(--success)]" : "text-[var(--foreground)]")}>{theirs}</span>
                    {complements && (
                      <span className="ml-1 text-[10px] text-[var(--success)]" title={t("complementsYou")}>
                        ▲
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-col gap-1">
                  <ThinBar pct={clampPct(mine, 10)} color="var(--muted)" size="sm" />
                  <ThinBar pct={clampPct(theirs, 10)} color={color} size="sm" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
        {t("footer")}{" "}
        <Link href="/onboarding" className="font-medium text-[var(--accent)] hover:underline">
          {t("adjustContext")}
        </Link>
      </p>
    </Card>
  );
}
