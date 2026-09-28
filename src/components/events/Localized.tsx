"use client";
/**
 * Dünne Client-Wrapper um Primitives, deren Text-Props nur Strings akzeptieren (PageHeader, Stat,
 * EmptyState): nehmen {de,en}-Paare und wählen per useLocale(). So bleiben Server-Components
 * zweisprachig, ohne die gemeinsamen Primitives anzufassen. Optik kommt 1:1 aus @/components/ui.
 */
import type { ReactNode } from "react";

import { EmptyState, PageHeader, Stat } from "@/components/ui";
import { pick, useLocale } from "@/lib/i18n";

import type { Bilingual } from "./labels";

export function LocalizedPageHeader({
  title,
  eyebrow,
  subtitle,
  action,
}: {
  title: string | Bilingual;
  eyebrow?: Bilingual;
  subtitle?: Bilingual;
  action?: ReactNode;
}) {
  const [locale] = useLocale();
  const p = (b?: Bilingual) => (b ? pick(locale, b.de, b.en) : undefined);
  return <PageHeader title={typeof title === "string" ? title : pick(locale, title.de, title.en)} eyebrow={p(eyebrow)} subtitle={p(subtitle)} action={action} />;
}

export function LocalizedStat({
  value,
  label,
  hint,
  icon,
  href,
  className,
}: {
  value: ReactNode;
  label: Bilingual;
  hint?: Bilingual;
  icon?: ReactNode;
  href?: string;
  className?: string;
}) {
  const [locale] = useLocale();
  return (
    <Stat
      value={value}
      label={pick(locale, label.de, label.en)}
      hint={hint ? pick(locale, hint.de, hint.en) : undefined}
      icon={icon}
      href={href}
      className={className}
    />
  );
}

export function LocalizedEmptyState({ title, body, action, icon }: { title: Bilingual; body?: Bilingual; action?: ReactNode; icon?: ReactNode }) {
  const [locale] = useLocale();
  return <EmptyState title={pick(locale, title.de, title.en)} body={body ? pick(locale, body.de, body.en) : undefined} action={action} icon={icon} />;
}
