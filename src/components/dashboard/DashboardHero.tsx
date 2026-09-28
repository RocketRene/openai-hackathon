"use client";
/**
 * Hero „Dein nächster Schritt" – kontextabhängig (localStorage → Client-Komponente).
 * Ohne Profil: Einladung mit zwei Wegen (Agent-Interview / Formular) + Demo.
 * Mit Profil: Begrüßung, ein Satz Zusammenfassung, CTA zu Matches und Assistent.
 */
import Link from "next/link";
import { useUserContext } from "@/lib/user-context";
import type { FounderRole, NetworkRole } from "@/lib/types";
import { Button, Kicker, LinkButton, Skeleton } from "@/components/ui";
import { formatVertical } from "@/components/candidates/CandidateCard";

const FOUNDER_ROLE_LABELS: Record<FounderRole, string> = {
  tech: "Tech-Founder",
  commercial: "Commercial-Founder",
  product: "Product-Founder",
  design: "Design-Founder",
  operations: "Operations-Founder",
  "domain-expert": "Domain-Expert:in",
};

const NETWORK_ROLE_PLURAL: Record<NetworkRole, string> = {
  cofounder: "Co-Founder",
  investor: "Investor:innen",
  mentor: "Mentor:innen",
  talent: "Talente",
  expert: "Expert:innen",
};

const FOUNDER_ROLE_SHORT: Record<FounderRole, string> = {
  tech: "Tech",
  commercial: "Commercial",
  product: "Product",
  design: "Design",
  operations: "Operations",
  "domain-expert": "Domain-Expertise",
};

function joinDe(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

const heroShell =
  "relative overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8";

function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--accent-soft)] opacity-70 blur-3xl"
    />
  );
}

export default function DashboardHero() {
  const { userContext, ready, loadDemo } = useUserContext();

  if (!ready) {
    return (
      <div className={heroShell}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  if (!userContext) {
    return (
      <section className={heroShell} aria-labelledby="hero-title">
        <HeroGlow />
        <div className="relative max-w-2xl">
          <Kicker>Dein nächster Schritt</Kicker>
          <h1 id="hero-title" className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Sag Voya, wer du bist – und wen du suchst.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Aus über 600 Profilen von IdeaLab 2026 und weiteren Events priorisieren wir Co-Founder, Investor:innen,
            Mentor:innen und Talente für dich. Zwei Minuten Kontext reichen.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <LinkButton href="/assistant" size="lg">
              Agent-Interview starten
            </LinkButton>
            <LinkButton href="/onboarding" size="lg" variant="secondary">
              Profil selbst ausfüllen
            </LinkButton>
            <Button variant="ghost" size="lg" onClick={loadDemo} className="sm:ml-1">
              Demo-Kontext laden
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const name = userContext.name.trim() || "Founder";
  const role = userContext.founderRole ? FOUNDER_ROLE_LABELS[userContext.founderRole] : "Gründer:in";
  const lookingFor = joinDe(userContext.lookingFor.map((r) => NETWORK_ROLE_PLURAL[r])) || "passende Kontakte";
  const roles = userContext.lookingForRoles.map((r) => FOUNDER_ROLE_SHORT[r]);
  const verticals = userContext.verticals.map(formatVertical);

  return (
    <section className={heroShell} aria-labelledby="hero-title">
      <HeroGlow />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Kicker>Dein nächster Schritt</Kicker>
          <h1 id="hero-title" className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Hallo {name}, deine Matches sind bereit.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Du bist {role} und suchst {lookingFor}
            {roles.length > 0 ? ` – vor allem mit ${joinDe(roles)}-Stärke` : ""}
            {verticals.length > 0 ? ` in ${joinDe(verticals)}` : ""}.
            {userContext.openToIdeas ? " Du bist offen für neue Ideen." : ""}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <LinkButton href="/candidates" size="lg">
              Top-Matches ansehen
            </LinkButton>
            <LinkButton href="/assistant" size="lg" variant="secondary">
              Mit dem Agenten sprechen
            </LinkButton>
            <Link
              href="/onboarding"
              className="px-2 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] sm:ml-1"
            >
              Profil bearbeiten
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
