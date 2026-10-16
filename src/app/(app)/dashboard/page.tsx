import { Carrossel } from "../_components/carrossel";

export default function Page({ searchParams }: PageProps<"/dashboard">) {
  return <Carrossel aba="/dashboard" searchParams={searchParams} />;
}
