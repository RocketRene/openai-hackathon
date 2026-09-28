"use client";
/**
 * Tipps-Panel: regelbasierte Tipps sofort (ohne API-Key), optional per /api/tips mit KI verfeinert.
 * Liest den Nutzer-Kontext ausschließlich über useUserContext(). Zweisprachig über useT/useLocale.
 */
import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, ScoreBar, SectionTitle, Skeleton } from "@/components/ui";
import { COMMON, useLocale, useT, type Dict, type Locale } from "@/lib/i18n";
import {
  FOUNDER_DIM_LABELS_I18N,
  STAGE_LABELS_I18N,
  TIP_CATEGORY_HINTS_I18N,
  TIP_CATEGORY_LABELS_I18N,
  TIP_PRIORITY_LABELS_I18N,
  generateTips,
  groupTipsByCategory,
  localize,
  normalizeTips,
  weakestDim,
} from "@/lib/tips";
import { FOUNDER_DIM_KEYS, type FounderDimKey, type Tip, type UserContext } from "@/lib/types";
import { useUserContext } from "@/lib/user-context";

type TipsSource = "rules" | "llm";

interface AiState {
  /** updatedAt des Kontexts, für den die KI-Tipps gelten – ändert sich das Profil, verfallen sie. */
  forUpdatedAt: string;
  /** Sprache, in der die KI-Tipps erzeugt wurden – bei Sprachwechsel verfallen sie. */
  forLocale: Locale;
  tips: Tip[];
  source: TipsSource;
}

const PRIORITY_TONE: Record<Tip["priority"], "danger" | "warning" | "neutral"> = {
  1: "danger",
  2: "warning",
  3: "neutral",
};

const DICT: Dict = {
  loadingProfile: { de: "Profil wird geladen …", en: "Loading profile …" },
  emptyTitle: { de: "Noch kein Profil vorhanden", en: "No profile yet" },
  emptyBody: {
    de: "Die Tipps richten sich nach deiner Rolle, Stage, Idee und Selbsteinschätzung. Lade den Demo-Kontext oder starte das Onboarding.",
    en: "Tips are based on your role, stage, idea and self-assessment. Load the demo context or start the onboarding.",
  },
  toOnboarding: { de: "Zum Onboarding", en: "Go to onboarding" },
  profileTitle: { de: "Dein Profil", en: "Your profile" },
  profileDesc: {
    de: "Grundlage für die Tipps – Rolle, Stage und Selbsteinschätzung.",
    en: "The basis for your tips – role, stage and self-assessment.",
  },
  edit: { de: "Bearbeiten", en: "Edit" },
  role: { de: "Rolle", en: "Role" },
  stage: { de: "Stage", en: "Stage" },
  weakest: { de: "Schwächste Dimension", en: "Weakest dimension" },
  notSet: { de: "nicht festgelegt", en: "not set" },
  lookingFor: { de: "Sucht", en: "Looking for" },
  missingRoles: { de: "Fehlende Rollen", en: "Missing roles" },
  verticals: { de: "Verticals", en: "Verticals" },
  selfAssessment: { de: "Selbsteinschätzung", en: "Self-assessment" },
  noName: { de: "Ohne Namen", en: "Unnamed" },
  tipsOne: { de: "1 Tipp", en: "1 tip" },
  tipsMany: { de: "{n} Tipps", en: "{n} tips" },
  sourceRules: { de: "Regelbasiert", en: "Rule-based" },
  sourceLlm: { de: "KI-verfeinert", en: "AI-refined" },
  sourceNoKey: { de: "Regeln · kein API-Key", en: "Rules · no API key" },
  refine: { de: "Mit KI verfeinern", en: "Refine with AI" },
  refining: { de: "Verfeinere …", en: "Refining …" },
  refineHint: {
    de: "Die KI konkretisiert die Regel-Tipps mit deinem Profil – Vertical, Stage, Idee, Stärken.",
    en: "AI sharpens the rule-based tips with your profile – vertical, stage, idea, strengths.",
  },
  showRules: { de: "Regel-Tipps anzeigen", en: "Show rule-based tips" },
  errPrefix: { de: "KI-Verfeinerung fehlgeschlagen", en: "AI refinement failed" },
  errStatus: { de: "Server antwortete mit Status {status}.", en: "Server responded with status {status}." },
  errFormat: { de: "Unerwartetes Antwortformat.", en: "Unexpected response format." },
  errEmpty: { de: "Keine Tipps erhalten.", en: "No tips received." },
  priority: { de: "Priorität", en: "Priority" },
};

export default function TipsPanel() {
  const t = useT(DICT);
  const tc = useT(COMMON);
  const [locale] = useLocale();
  const { userContext, ready, loadDemo } = useUserContext();
  const [ai, setAi] = useState<AiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ruleTips = useMemo(() => (userContext ? generateTips(userContext, { locale }) : []), [userContext, locale]);
  const aiState =
    ai && userContext && ai.forUpdatedAt === userContext.updatedAt && ai.forLocale === locale ? ai : null;
  const tips = aiState?.tips ?? ruleTips;

  async function refine() {
    if (!userContext) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userContext, locale }),
      });
      if (!res.ok) throw new Error(t("errStatus", { status: res.status }));
      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error(t("errFormat"));
      const refined = normalizeTips(data, ruleTips);
      if (refined.length === 0) throw new Error(t("errEmpty"));
      setAi({
        forUpdatedAt: userContext.updatedAt,
        forLocale: locale,
        tips: refined,
        source: res.headers.get("x-tips-source") === "llm" ? "llm" : "rules",
      });
    } catch (e) {
      setError(e instanceof Error ? `${t("errPrefix")}: ${e.message}` : `${t("errPrefix")}.`);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("loadingProfile")}>
        <ProfileSkeleton />
        <TipsSkeleton count={6} />
      </div>
    );
  }

  if (!userContext) {
    return (
      <EmptyState
        icon={<span aria-hidden="true">✦</span>}
        title={t("emptyTitle")}
        body={t("emptyBody")}
        action={
          <>
            <Button onClick={loadDemo}>{tc("loadDemo")}</Button>
            <LinkButton href="/onboarding" variant="secondary">
              {t("toOnboarding")}
            </LinkButton>
          </>
        }
      />
    );
  }

  const groups = groupTipsByCategory(tips);
  const sourceBadge = aiState ? (
    aiState.source === "llm" ? (
      <Badge tone="accent">✦ {t("sourceLlm")}</Badge>
    ) : (
      <Badge tone="warning">{t("sourceNoKey")}</Badge>
    )
  ) : (
    <Badge tone="neutral">{t("sourceRules")}</Badge>
  );

  return (
    <div className="flex flex-col gap-6">
      <ProfileSummary user={userContext} locale={locale} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {tips.length === 1 ? t("tipsOne") : t("tipsMany", { n: tips.length })}
          </span>
          {sourceBadge}
          <span className="hidden text-xs text-[var(--muted)] lg:inline">· {t("refineHint")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {aiState && (
            <Button variant="ghost" size="sm" onClick={() => setAi(null)}>
              {t("showRules")}
            </Button>
          )}
          <Button onClick={refine} loading={loading}>
            {loading ? t("refining") : <>✦ {t("refine")}</>}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          <span className="min-w-0 break-words">{error}</span>
          <Button variant="ghost" size="sm" onClick={refine} disabled={loading}>
            {tc("retry")}
          </Button>
        </div>
      )}

      {loading ? (
        <TipsSkeleton count={Math.max(6, Math.min(tips.length, 9))} />
      ) : (
        groups.map((group) => (
          <section key={group.category} className="fr-fade-in">
            <SectionTitle
              action={
                <span className="text-xs text-[var(--muted)]">{localize(TIP_CATEGORY_HINTS_I18N[group.category], locale)}</span>
              }
            >
              <span className="inline-flex items-center gap-2">
                {localize(TIP_CATEGORY_LABELS_I18N[group.category], locale)}
                <Badge tone="neutral">{group.tips.length}</Badge>
              </span>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.tips.map((tip) => (
                <TipCard key={tip.id} tip={tip} locale={locale} priorityLabel={t("priority")} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function dimTone(value: number): "danger" | "warning" | "neutral" {
  if (value <= 2) return "danger";
  if (value < 5) return "warning";
  return "neutral";
}

function ProfileSummary({ user, locale }: { user: UserContext; locale: Locale }) {
  const t = useT(DICT);
  const tc = useT(COMMON);
  const weak: FounderDimKey = weakestDim(user.dims);
  const weakValue = user.dims[weak];
  const weakTone = dimTone(weakValue);
  const name = user.name.trim();

  const facts: Array<{ label: string; values: string[] }> = [
    { label: t("lookingFor"), values: user.lookingFor.map((r) => tc(r)) },
    { label: t("missingRoles"), values: user.lookingForRoles.map((r) => tc(r)) },
    { label: t("verticals"), values: user.verticals },
  ];

  return (
    <Card
      title={t("profileTitle")}
      description={t("profileDesc")}
      action={
        <LinkButton href="/onboarding" variant="ghost" size="sm">
          {t("edit")}
        </LinkButton>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={name || "?"} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">{name || t("noName")}</p>
            {user.headline?.trim() && <p className="truncate text-sm text-[var(--muted)]">{user.headline}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">
              {t("role")}: {user.founderRole ? tc(user.founderRole) : t("notSet")}
            </Badge>
            <Badge tone="neutral">
              {t("stage")}: {user.stage ? localize(STAGE_LABELS_I18N[user.stage], locale) : t("notSet")}
            </Badge>
            <Badge tone={weakTone} dot>
              {t("weakest")}: {localize(FOUNDER_DIM_LABELS_I18N[weak], locale)} {weakValue}/10
            </Badge>
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs text-[var(--muted)]">{f.label}</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {f.values.length ? (
                  f.values.map((v) => (
                    <span
                      key={v}
                      className="inline-flex max-w-full items-center truncate rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]"
                    >
                      {v}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted)]">–</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="mb-2 text-xs text-[var(--muted)]">{t("selfAssessment")}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
            {FOUNDER_DIM_KEYS.map((k) => (
              <ScoreBar
                key={k}
                label={localize(FOUNDER_DIM_LABELS_I18N[k], locale)}
                value={user.dims[k]}
                max={10}
                tone={k === weak && weakTone !== "neutral" ? weakTone : "accent"}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TipCard({ tip, locale, priorityLabel }: { tip: Tip; locale: Locale; priorityLabel: string }) {
  return (
    <Card interactive className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={PRIORITY_TONE[tip.priority]} dot>
          {localize(TIP_PRIORITY_LABELS_I18N[tip.priority], locale)}
        </Badge>
        <span className="text-[11px] text-[var(--muted)]" title={priorityLabel}>
          P{tip.priority}
        </span>
      </div>
      <h4 className="text-sm font-semibold leading-snug tracking-tight text-[var(--foreground)] [overflow-wrap:anywhere]">{tip.title}</h4>
      <p className="text-sm leading-relaxed text-[var(--muted)] [overflow-wrap:anywhere]">{tip.body}</p>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32 max-w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
          {FOUNDER_DIM_KEYS.map((k) => (
            <div key={k} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TipsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </Card>
      ))}
    </div>
  );
}
