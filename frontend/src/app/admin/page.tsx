import { redirect } from 'next/navigation';

/**
 * Ponto de entrada do painel administrativo.
 *
 * `/admin` NÃO renderiza nenhuma tela: redireciona sempre para o Dashboard
 * (`/admin/dashboard`). Antes deste ajuste o índice do admin era uma tela
 * própria, o que fazia links antigos, atalhos e o histórico do browser
 * caírem em telas intermediárias (ex.: formulário de produto).
 *
 * O redirect acontece no servidor, antes de o shell do admin pintar a tela.
 */
export default function AdminIndexPage() {
  redirect('/admin/dashboard');
}
