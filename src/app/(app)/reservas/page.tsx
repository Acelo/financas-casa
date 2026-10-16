import { Carrossel } from "../_components/carrossel";

export default function Page({ searchParams }: PageProps<"/reservas">) {
  return <Carrossel aba="/reservas" searchParams={searchParams} />;
}
