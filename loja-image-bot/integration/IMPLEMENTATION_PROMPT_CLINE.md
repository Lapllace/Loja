# Prompt de integração do Image Bot na Loja

Você vai integrar o Image Bot ao projeto real sem reescrever a arquitetura existente.

## Regras

- Antes de editar, leia os módulos Auth, Users, Prisma schema, JwtStrategy, Admin e uploads.
- Preserve CUSTOMER/ADMIN/OWNER.
- NÃO crie um quarto papel comercial `DEVELOPER`.
- Adicione `User.isDeveloper Boolean @default(false)` como permissão técnica separada.
- Somente `isDeveloper === true` pode acessar as rotas do Image Bot.
- A autorização deve ser feita no backend com `JwtAuthGuard + DeveloperGuard`.
- Nunca confie somente em ocultar a página no frontend.
- Nunca exponha `SERPAPI_KEY` ao navegador.
- Não baixe automaticamente as primeiras imagens.
- Fluxo obrigatório: buscar -> revisar -> selecionar até 5 -> baixar.
- Preserve origem, página de origem, consulta, data e hash SHA-256 em `manifest.json`.
- Bloqueie URLs locais/privadas para evitar SSRF.
- Limite downloads a 12 MB por imagem e aceite somente imagens com assinatura JPEG/PNG/WebP/GIF.
- Não copie conteúdo de marketplace em massa nem implemente scraping agressivo; use o provider via API e faça seleção manual.

## Passos

1. Adicione `isDeveloper` ao Prisma User.
2. Crie migration com Prisma.
3. Atualize `JwtStrategy` para colocar `isDeveloper` no `req.user`.
4. Adicione o `DeveloperGuard`.
5. Adicione o `ImageSearchModule` e importe no `AppModule`.
6. Copie/adapte `src/core`, `src/providers` e a integração Nest deste pacote.
7. Configure `SERPAPI_KEY` e `IMAGE_BOT_STORAGE_DIR` somente no backend.
8. Adapte os imports do guard e de ConfigService aos caminhos reais do projeto.
9. Crie `/admin/desenvolvedor/imagens` usando o componente `ImageSearchPanel` como referência.
10. Atualize o tipo `User` no frontend com `isDeveloper: boolean`.
11. Use a sessão/token já existente; não crie outro mecanismo de autenticação.
12. Execute testes backend, build backend, lint e build frontend.
13. Verifique que CUSTOMER/ADMIN/OWNER sem `isDeveloper` recebem 403.
14. Verifique que um usuário com `isDeveloper=true` consegue buscar e selecionar imagens.
15. Verifique que uma URL privada/local é bloqueada.
16. Verifique que mais de 5 imagens são rejeitadas.
17. Verifique que o `manifest.json` registra os metadados.
18. Não faça commit.

## Concessão do meu perfil

Depois da migration, rode no backend:

`node scripts/grant-developer.mjs SEU_EMAIL`

Não hardcode o email no código. O comando deve localizar a conta pelo email e marcar `isDeveloper=true`.
