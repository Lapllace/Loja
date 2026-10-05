# SECURITY

# ==========================================================
# GIL IMPORTS
# SEGURANÇA DO SISTEMA
# ==========================================================

Versão: 2.0

Este documento define as regras de segurança do sistema.

==========================================================

# OBJETIVO

Proteger dados operacionais e financeiros.

Segurança adequada para operação doméstica (Umbrel).

Sem complexidade desnecessária.

==========================================================

# AUTENTICAÇÃO

JWT + Refresh Token.

Logout invalida refresh token.

Tempo de expiração configurável via .env.

==========================================================

# SENHAS

Nunca armazenar em texto plano.

bcrypt com salt.

Mínimo 8 caracteres, letras e números.

==========================================================

# USUÁRIOS E ROLES

Roles: ADMIN, EMPLOYEE.

Tabela suporta múltiplos usuários.

Hoje: 2 usuários cadastrados.

Somente ADMIN gerencia usuários (CRUD).

==========================================================

# PERMISSÕES E DADOS FINANCEIROS

ADMIN e EMPLOYEE: mesmas permissões operacionais.

Somente ADMIN acessa:

cost_price (produtos e itens de pedido)

lucro (calculado)

margem (calculada)

faturamento detalhado com breakdown de lucro

O backend DEVE filtrar esses campos para EMPLOYEE:

Interceptor ou helper no service layer.

Endpoints de dashboard retornam profit/margin apenas para ADMIN.

Tentativa de acesso direto retorna 403.

==========================================================

# BANCO DE DADOS

Soft Delete para registros importantes.

Nunca apagar pedidos.

Nunca apagar movimentações de estoque.

UUID como chave primária.

==========================================================

# API

Validação de DTOs (class-validator).

Rate Limit básico.

Helmet.

CORS configurado (origins permitidos via .env).

Proteção SQL Injection via Prisma (parametrizado).

==========================================================

# WEBHOOK PAGBANK

Endpoint /payments/webhook sem autenticação JWT.

Validar token/assinatura do PagBank.

Registrar tentativas inválidas.

Idempotência (não processar pagamento duplicado).

==========================================================

# UPLOADS

Validar tipo MIME (jpeg, png, webp).

Limitar tamanho (ex: 5MB).

Sanitizar nome do arquivo.

Armazenar fora da pasta pública do frontend.

Servir via endpoint autenticado ou rota estática controlada.

==========================================================

# BACKUP

Backup diário do PostgreSQL.

Backup do diretório storage/.

Armazenar em local diferente do banco.

Configurar na fase de deploy Umbrel.

==========================================================

# UMBREL

HTTPS obrigatório.

Firewall ativo.

Atualizações periódicas do sistema.

Variáveis sensíveis em .env (nunca commitar).

==========================================================

# AUDITORIA (MVP ENXUTO)

Registrar movimentações de estoque (já previsto).

Registrar alterações de status de pedido (via updated_at + log simples).

Auditoria completa com IP: fora do escopo da v1.

==========================================================

# OBJETIVO FINAL

Segurança suficiente para operação de pequena loja.

Proteção real dos dados financeiros no backend.

Sem over-engineering.
