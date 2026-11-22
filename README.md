# Agenda dos Anciãos

Calendário único das programações da Associação, do distrito e da igreja local,
com lembretes para cada ancião avisar os líderes dos seus departamentos.
Requisitos em [`PRD.md`](PRD.md).

## Rodar localmente

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor** do Supabase, rode o conteúdo de
   `supabase/migrations/20261122000000_inicial.sql`.
3. Configure o ambiente:
   ```bash
   cp .env.example .env.local   # preencha com as chaves de Project Settings > API
   npm install
   ```
4. Copie `scripts/dados.exemplo.json` para `scripts/dados.local.json` e preencha
   com os dados reais (anciãos, pastor, departamentos, líderes). Esse arquivo
   **não vai para o git**, porque o repositório é público. Depois rode:
   ```bash
   SEED_SENHA=uma-senha-inicial npm run seed
   ```
   Pode rodar de novo quantas vezes quiser: nada duplica. Use `npm run seed -- --exemplos`
   para incluir programações de exemplo.
5. `npm run dev` e abra http://localhost:3000.

## Publicar (Vercel)

1. Importe o repositório na Vercel e copie as variáveis do `.env.local`.
2. Gere um `CRON_SECRET` aleatório; a Vercel o envia automaticamente aos crons.
3. Crie uma conta no [Resend](https://resend.com), verifique o domínio do
   remetente e preencha `RESEND_API_KEY` e `EMAIL_REMETENTE`.
4. Os crons em `vercel.json` disparam os resumos às 8h (Brasília):
   semanal toda segunda e mensal todo dia 1º.

Para ver os resumos sem enviar e-mail:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://SEU-APP/api/cron/resumos?tipo=semanal&teste=1"
```

## Validar mudanças
```bash
npm run typecheck && npm run lint && npm test && npm run build
DATABASE_URL=postgres://... npm run test:db   # schema + RLS num Postgres descartável
```
