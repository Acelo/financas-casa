import { Carrossel } from "../_components/carrossel";

export default function Page({ searchParams }: PageProps<"/recorrentes">) {
  return <Carrossel aba="/recorrentes" searchParams={searchParams} />;
}
