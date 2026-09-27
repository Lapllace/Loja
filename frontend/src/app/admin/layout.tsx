import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';

/**
 * Layout compartilhado por todas as telas /admin.
 * Adia a proteção de rota para o AdminShell (client) porque a sessão vive
 * no localStorage — o backend continua sendo a autoridade real.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
