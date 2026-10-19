import { FormNovaSenha } from "../login/form-nova-senha";
import { TelaMarca } from "../login/marca";

export const metadata = { title: "Nova senha" };

// Aberta pelo link do e-mail (/auth/confirmar já criou a sessão de
// recuperação). Sem sessão, o proxy manda para o login.
export default function RedefinirSenha() {
  return (
    <TelaMarca subtitulo="Criar nova senha">
      <FormNovaSenha />
    </TelaMarca>
  );
}
