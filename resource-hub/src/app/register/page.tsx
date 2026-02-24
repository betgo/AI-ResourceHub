import { AuthForm } from "@/components/auth/auth-form";
import { Container } from "@/components/layout/container";

type RegisterPageProps = {
  searchParams?:
    | Promise<{ next?: string | string[] }>
    | { next?: string | string[] };
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawNext = resolvedSearchParams?.next;
  const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext;

  return (
    <section className="py-14 sm:py-20">
      <Container>
        <AuthForm mode="register" nextPath={nextPath} />
      </Container>
    </section>
  );
}
