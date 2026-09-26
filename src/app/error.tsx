"use client";
import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        title="Da ist etwas schiefgelaufen"
        body={error.message || "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut."}
        action={<Button onClick={reset}>Erneut versuchen</Button>}
      />
    </div>
  );
}
