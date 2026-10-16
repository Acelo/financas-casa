import { Carrossel } from "../_components/carrossel";

export default function Page({ searchParams }: PageProps<"/receitas">) {
  return <Carrossel aba="/receitas" searchParams={searchParams} />;
}
