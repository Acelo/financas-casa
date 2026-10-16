import { Carrossel } from "./_components/carrossel";

export default function Page({ searchParams }: PageProps<"/">) {
  return <Carrossel aba="/" searchParams={searchParams} />;
}
