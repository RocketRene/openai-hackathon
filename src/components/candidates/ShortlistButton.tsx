"use client";
/**
 * Toggle-Button "Merken" / "Gemerkt ✓" – überall einsetzbar (Karte, Detailseite, Assistent).
 * Stoppt die Klick-Propagation, damit er auch innerhalb verlinkter Karten funktioniert.
 */
import type { MouseEvent } from "react";
import { Button } from "@/components/ui";
import { useShortlist } from "@/lib/shortlist";

export interface ShortlistButtonProps {
  profileId: string;
  size?: "sm" | "md";
  className?: string;
}

export function ShortlistButton({ profileId, size = "md", className }: ShortlistButtonProps) {
  const { has, toggle, ready } = useShortlist();
  const active = ready && has(profileId);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(profileId);
  };

  return (
    <Button
      type="button"
      size={size}
      variant={active ? "primary" : "secondary"}
      aria-pressed={active}
      title={active ? "Von der Shortlist entfernen" : "Auf die Shortlist setzen"}
      onClick={onClick}
      className={className}
    >
      {active ? "Gemerkt ✓" : "Merken"}
    </Button>
  );
}

export default ShortlistButton;
