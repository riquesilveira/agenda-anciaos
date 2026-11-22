# Agenda dos Anciãos

Calendário único das programações da Associação, do distrito e da igreja local,
com lembretes para cada ancião avisar os líderes dos seus departamentos.
Requisitos em [`PRD.md`](PRD.md).

## Rodar localmente

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor** do Supabase, rode os arquivos de `supabase/migrations/`
   em ordem (nome do arquivo = data).
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

## Calendário da Associação

O PDF anual da Associação (em grade mensal) vira dados assim:
```bash
pip install pdfplumber
python3 scripts/extrair-calendario-pdf.py Calendario_ANP_2027.pdf dados/associacao-2027.json
npm run importar -- dados/associacao-2027.json --previa   # confere antes
npm run importar -- dados/associacao-2027.json            # grava
```
- Eventos em dias seguidos viram um só (ex: Missão Calebe 16/01 a 29/01).
- Cada evento é ligado a um departamento por palavras-chave (`src/lib/importacao.ts`).
  Sem departamento correspondente, ele aparece só no calendário.
- Comissão Interna/Diretiva ficam de fora (use `--com-comissoes` para incluir).
- Importar de novo não duplica nem desfaz ajustes feitos no app.

O de 2027 já está extraído em `dados/associacao-2027.json`.

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
