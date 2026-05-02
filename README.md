# ACS Controle Saude

Sistema web responsivo para Agente Comunitario de Saude acompanhar familias, moradores, visitas domiciliares, pendencias e indicadores prioritarios.

## Stack

- React + Vite + TypeScript
- CSS responsivo mobile-first
- Supabase como banco e autenticacao
- Vercel para hospedagem
- Exportacao PDF e Excel

## Rodar localmente

```bash
npm install
npm run dev
```

O login local sem Supabase fica em modo demonstracao apenas durante o desenvolvimento. Em build de producao, o acesso exige `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas.

## Configurar Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o arquivo `supabase/schema.sql`.
4. Copie `.env.example` para `.env.local`.
5. Preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

## Deploy na Vercel

1. Suba o projeto para um repositorio GitHub.
2. Importe o repositorio na Vercel.
3. Configure as variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Use o comando de build padrao:

```bash
npm run build
```

## Telas implementadas

- Login
- Dashboard com indicadores
- Logradouros
- Familias/domicilios
- Moradores
- Visitas domiciliares
- Caderneta vacinal
- Indicadores por grupo
- Relatorios com exportacao PDF/Excel
- Configuracoes de unidade, microarea e prazo de visita
- Criacao de conta e recuperacao de senha via Supabase Auth

## Regras contempladas

- Idade calculada automaticamente pela data de nascimento
- Crianca de 0 a 2 anos calculada automaticamente
- Idoso acima de 60 anos calculado automaticamente
- Grupo "hipertensos e diabeticos"
- Evita CPF duplicado no cadastro local
- Historico de visitas
- Status de familia atualizado ao registrar visita
- Schema Supabase com RLS por usuario
- Configuracoes persistidas no Supabase quando conectado

## Proximas integracoes

- Troca de senha dentro do sistema
- Backups automaticos reais
- Validadores de CPF, CNS, NIS, peso e altura
- Filtros funcionais no dashboard por hoje, semana, mes e prioridades
- Adicionar testes end-to-end em telas mobile/tablet
