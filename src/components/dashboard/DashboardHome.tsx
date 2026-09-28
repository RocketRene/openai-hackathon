import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import { T } from "@/lib/i18n";
import DashboardHero from "./DashboardHero";
import HowItWorks from "./HowItWorks";
import QuickAccess from "./QuickAccess";
import StatsRow from "./StatsRow";
import TopMatches from "./TopMatches";
import UpcomingEvents from "./UpcomingEvents";
import { SECTION_LINK_CLS } from "./shared";

/**
 * Startseite als Cockpit (Server-Component):
 * Hero → Kennzahlen → Top-Matches + nächste Events → Schnellzugriff → So funktioniert's.
 */
export default function DashboardHome() {
  return (
    <>
      <DashboardHero />

      <div className="space-y-10">
        <section aria-label="Das Ökosystem in Zahlen" className="fr-fade-in">
          <SectionTitle
            action={
              <Link href="/network" className={SECTION_LINK_CLS}>
                <T de="Netzwerk-Analyse →" en="Network analysis →" />
              </Link>
            }
          >
            <T de="Das Ökosystem in Zahlen" en="The ecosystem in numbers" />
          </SectionTitle>
          <StatsRow />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <TopMatches />
          </div>
          <div className="min-w-0">
            <UpcomingEvents />
          </div>
        </div>

        <QuickAccess />

        <HowItWorks />
      </div>
    </>
  );
}
