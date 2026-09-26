export default function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-[var(--muted)]" role="status" aria-live="polite">
      <span
        className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
        aria-hidden="true"
      />
      Lädt …
    </div>
  );
}
