import { Container } from "@/components/layout/container";
import { SkeletonBlock } from "@/components/skeleton/skeleton-block";

export default function ResourceDetailLoading() {
  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6" aria-busy="true">
        <section className="space-y-3">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-4 w-56" />
          <SkeletonBlock className="h-10 w-3/4" />
          <SkeletonBlock className="h-5 w-full max-w-3xl" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-7 w-24 rounded-full" />
            <SkeletonBlock className="h-7 w-28 rounded-full" />
          </div>
        </section>

        <SkeletonBlock className="h-64 w-full rounded-2xl sm:h-80" />

        <section className="space-y-4 rounded-2xl border border-[var(--stroke-soft)] bg-white p-6 shadow-sm">
          <div className="flex gap-3">
            <SkeletonBlock className="h-9 w-28 rounded-full" />
            <SkeletonBlock className="h-9 w-28 rounded-full" />
          </div>
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </section>
      </Container>
    </div>
  );
}
