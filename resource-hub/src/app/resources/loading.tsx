import { Container } from "@/components/layout/container";
import { SkeletonBlock } from "@/components/skeleton/skeleton-block";

const CARD_COUNT = 6;

export default function ResourcesLoading() {
  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6" aria-busy="true">
        <section className="space-y-3">
          <SkeletonBlock className="h-10 w-64" />
          <SkeletonBlock className="h-5 w-full max-w-3xl" />
        </section>

        <section className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonBlock className="h-10 md:col-span-2" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-20" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: CARD_COUNT }).map((_, index) => (
            <article
              key={`resource-card-skeleton-${index}`}
              className="space-y-3 rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm"
            >
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-6 w-4/5" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-11/12" />
              <SkeletonBlock className="h-4 w-2/3" />
            </article>
          ))}
        </section>
      </Container>
    </div>
  );
}
