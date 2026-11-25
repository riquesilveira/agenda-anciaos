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

## Publicar (Render)

O site roda no Render; banco e login continuam no Supabase.

1. No Render: **New > Blueprint**, escolha este repositório. O `render.yaml`
   cria o serviço `iasdagenda` (plano free) e pede as variáveis do
   `.env.example`. `CRON_SECRET` é gerado sozinho.
2. Depois do primeiro deploy, preencha `NEXT_PUBLIC_APP_URL` com o endereço
   do Render (ex: `https://iasdagenda.onrender.com`) e faça **Manual Deploy**.
   Variáveis `NEXT_PUBLIC_*` entram no build, então mudança nelas pede novo deploy.
3. No Supabase: **Authentication > URL Configuration > Site URL** = o mesmo endereço.
4. E-mail: crie uma conta no [Resend](https://resend.com), verifique o domínio
   do remetente e preencha `RESEND_API_KEY` e `EMAIL_REMETENTE`.

### Resumos automáticos (GitHub Actions)
`.github/workflows/resumos.yml` chama o sistema às 8h (Brasília): semanal toda
segunda e mensal todo dia 1º. Configure no GitHub
(**Settings > Secrets and variables > Actions**):
- secret `CRON_SECRET`: copie o valor gerado no Render;
- variable `APP_URL`: o endereço do Render, sem barra no fim.

Para testar: **Actions > Resumos por e-mail > Run workflow** (com `teste = 1`
mostra os resumos no log sem enviar e-mail).

> **Plano grátis do Render:** o site dorme depois de ~15 min parado e a 1ª
> abertura demora uns 30 s. **Não** coloque keep-alive aqui: as 750 h grátis
> por mês são compartilhadas por todos os serviços da conta, e o keep-alive do
> Helsis já usa quase todas.

## Validar mudanças
```bash
npm run typecheck && npm run lint && npm test && npm run build
DATABASE_URL=postgres://... npm run test:db   # schema + RLS num Postgres descartável
```
