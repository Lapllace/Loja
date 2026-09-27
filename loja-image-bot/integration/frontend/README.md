# Integração frontend

Crie uma página somente para desenvolvedor, por exemplo:

`frontend/src/app/admin/desenvolvedor/imagens/page.tsx`

A página deve:

1. obter a sessão existente da Loja;
2. chamar `/api/auth/me`;
3. se `user.isDeveloper !== true`, não renderizar o painel e mostrar 403;
4. se for desenvolvedor, renderizar `ImageSearchPanel`;
5. passar `NEXT_PUBLIC_API_URL` e o bearer token da sessão.

A checagem visual é apenas UX. A proteção real continua no `DeveloperGuard` do backend.
