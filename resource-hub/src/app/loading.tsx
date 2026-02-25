import { Container } from "@/components/layout/container";
import { SkeletonBlock } from "@/components/skeleton/skeleton-block";

export default function AppLoading() {
  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6" aria-busy="true">
        <SkeletonBlock className="h-10 w-64" />
        <SkeletonBlock className="h-5 w-full max-w-2xl" />
        <section className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-40" />
          </div>
        </section>
      </Container>
    </div>
  );
}
