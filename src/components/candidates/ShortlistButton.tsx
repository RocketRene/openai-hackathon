"use client";
/**
 * Toggle-Button "Merken" / "Gemerkt" mit ☆/★-Zustand – überall einsetzbar (Karte, Detailseite, Assistent).
 * Sekundärer Button; aktiv wird er zur Outline in Akzentfarbe. Texte aus COMMON (DE/EN).
 * Stoppt die Klick-Propagation, damit er auch innerhalb verlinkter Karten funktioniert.
 */
import type { MouseEvent } from "react";
import { Button, cx } from "@/components/ui";
import { COMMON, useT, type Dict } from "@/lib/i18n";
import { useShortlist } from "@/lib/shortlist";

const DICT: Dict = {
  add: { de: "Auf die Shortlist setzen", en: "Add to shortlist" },
  remove: { de: "Von der Shortlist entfernen", en: "Remove from shortlist" },
};

export interface ShortlistButtonProps {
  profileId: string;
  size?: "sm" | "md";
  className?: string;
}

export function ShortlistButton({ profileId, size = "md", className }: ShortlistButtonProps) {
  const { has, toggle, ready } = useShortlist();
  const t = useT(DICT);
  const tc = useT(COMMON);
  const active = ready && has(profileId);
  // COMMON.shortlisted endet auf " ✓" – hier übernimmt der Stern den Zustand.
  const label = active ? tc("shortlisted").replace(/\s*✓\s*$/u, "") : tc("shortlist");

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(profileId);
  };

  return (
    <Button
      type="button"
      size={size}
      variant={active ? "outline" : "secondary"}
      aria-pressed={active}
      title={active ? t("remove") : t("add")}
      onClick={onClick}
      className={cx("group", className)}
    >
      <span
        aria-hidden
        className={cx(
          "text-[1.15em] leading-none transition-transform duration-200 group-hover:scale-110",
          active ? "text-[var(--accent)]" : "text-[var(--muted)]",
        )}
      >
        {active ? "★" : "☆"}
      </span>
      {label}
    </Button>
  );
}

export default ShortlistButton;
