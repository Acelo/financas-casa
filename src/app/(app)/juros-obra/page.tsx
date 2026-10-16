import { Carrossel } from "../_components/carrossel";

export default function Page({ searchParams }: PageProps<"/juros-obra">) {
  return <Carrossel aba="/juros-obra" searchParams={searchParams} />;
}
