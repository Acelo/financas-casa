import { FormTrocarSenha } from "./form-trocar-senha";

export const metadata = { title: "Trocar senha" };

export default function TrocarSenha() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Trocar senha</h1>
        <p className="text-sm text-muted">A nova senha passa a valer neste e nos outros aparelhos.</p>
      </div>
      <FormTrocarSenha />
    </div>
  );
}
