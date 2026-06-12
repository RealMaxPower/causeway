import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { PlaybookForm } from "@/components/playbook/PlaybookForm";
import styles from "@/components/playbook/playbook.module.css";

export const metadata = {
  title: "Personal Macro Playbook · Causeway",
  description:
    "Eight axes from Track H, distilled into a print-friendly playbook of your own positions. Saved locally, shareable by link.",
};

interface PageProps {
  searchParams: Promise<{ state?: string }>;
}

export default async function PlaybookPage({ searchParams }: PageProps) {
  const { state } = await searchParams;

  return (
    <>
      <Topbar
        crumb={
          <Crumb
            segments={[
              <Link key="map" href="/" className="hover:text-ink-2 no-underline">
                Track map
              </Link>,
              <span key="now" className="text-ink-2">
                Personal Macro Playbook
              </span>,
            ]}
          />
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-9 py-12"
      >
        <section className={styles.hero}>
          <div className={styles.heroLabel}>
            ◇ Cross-cutting · output
            <span className="text-gold-deep">●</span>
            <span>saves locally · share by link</span>
          </div>
          <h1 className={styles.heroTitle}>Personal Macro Playbook</h1>
          <p className={styles.heroBlurb}>
            Pick your stance across the eight Track H axes. The summary
            below renders as a one-page printable playbook — directional
            defaults you can actually act on. Your answers are saved in
            this browser; share a copy by link, or print to PDF.
          </p>
        </section>

        <PlaybookForm initialShareable={state} />
      </main>

      <Footer />
    </>
  );
}
