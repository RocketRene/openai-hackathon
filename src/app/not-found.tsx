import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        title="Seite nicht gefunden"
        body="Die angeforderte Seite existiert nicht oder wurde verschoben."
        action={<LinkButton href="/">Zum Dashboard</LinkButton>}
      />
    </div>
  );
}
