# ACS Controle Saúde

Sistema web responsivo para Agente Comunitário de Saúde acompanhar famílias, moradores, visitas domiciliares, pendências e indicadores prioritários.

## Stack

- React + Vite + TypeScript
- CSS responsivo mobile-first
- Supabase como banco e autenticação
- Vercel para hospedagem
- Exportação PDF e Excel

## Rodar localmente

```bash
npm install
npm run dev
```

O login local sem Supabase fica em modo demonstração apenas durante o desenvolvimento. Em build de produção, o acesso exige `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas.

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

1. Suba o projeto para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Use o comando de build padrão:

```bash
npm run build
```

## Telas implementadas

- Login
- Dashboard com indicadores
- Logradouros
- Famílias/domicílios
- Moradores
- Visitas domiciliares
- Caderneta vacinal
- Indicadores por grupo
- Relatórios com exportação PDF/Excel
- Configurações de unidade, microárea e prazo de visita
- Criação de conta e recuperação de senha via Supabase Auth

## Regras contempladas

- Idade calculada automaticamente pela data de nascimento
- Criança de 0 a 2 anos calculada automaticamente
- Idoso acima de 60 anos calculado automaticamente
- Grupo "hipertensos e diabéticos"
- Evita CPF duplicado no cadastro local
- Histórico de visitas
- Status de família atualizado ao registrar visita
- Schema Supabase com RLS por usuário
- Configurações persistidas no Supabase quando conectado

## Próximas integrações

- Troca de senha dentro do sistema
- Backups automáticos reais
- Validadores de CPF, CNS, NIS, peso e altura
- Filtros funcionais no dashboard por hoje, semana, mês e prioridades
- Adicionar testes end-to-end em telas mobile/tablet
