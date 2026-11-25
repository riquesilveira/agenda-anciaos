# Contexto do projeto: Agenda dos Anciãos

Antes de planejar algo novo, leia **`PRD.md`** (requisitos e o que ficou fora da v1).

## Stack
Next.js 15 (App Router, Server Actions) + Supabase (Auth + Postgres + RLS) +
Tailwind 4 + date-fns + lucide-react. E-mail via Resend, site no Render, agendamento via GitHub Actions (`.github/workflows/resumos.yml`).

## Estrutura
- `supabase/migrations/`: schema e policies RLS. Mudança de banco = migration nova.
- `src/lib/conflitos.ts`, `src/lib/resumo.ts`: regras de negócio puras, testadas em `src/lib/__tests__/`.
- `src/app/(app)/acoes.ts`: todas as Server Actions (gravação).
- `src/app/api/cron/resumos`: envio dos resumos por e-mail (service role).
- `scripts/extrair-calendario-pdf.py` (PDF da Associação -> `dados/*.json`) e
  `scripts/importar.ts` (JSON -> banco). Regras de departamento em `src/lib/importacao.ts`.

## Convenções (manter)
- **Toda coluna/relação nova no banco precisa de um campo em `src/lib/tipos.ts`.**
- **Isolamento por igreja é feito no RLS** (`minha_igreja()`), não só no código.
  O código do app usa o cliente com sessão (`supabaseServidor`); `supabaseAdmin`
  (service role) só no cron e em scripts, e lá o filtro por `igreja_id` é manual.
- **Papéis:** `anciao` e `pastor` podem tudo na igreja; `lider` vê tudo mas só
  escreve em programações locais dos departamentos que lidera
  (`departamento_lideres`). Garantia no RLS (`posso_editar_departamento`);
  `src/lib/permissoes.ts` só espelha para a interface.
- **Identidade vem da sessão** (`exigirPerfil`), nunca de um id vindo do formulário.
- **Datas** são `date` + `time` sem fuso; "hoje" sempre por `hojeISO()` (Brasília),
  porque o servidor (Render) roda em UTC.
- **Conflito é aviso, não bloqueio.**
- **Programação pode ter vários dias** (`data` a `data_fim`). Ao filtrar por
  período, use `listarProgramacoes`/`fimDe`/`periodosSeCruzam`, nunca só `data`.
- Textos para pessoas usam `tratamento()` e redação neutra ("Você acompanha…"),
  nunca "o ancião" fixo.
- `scripts/seed.ts` é idempotente (upsert): mantenha assim.
- **O repositório é público:** nada de nomes, e-mails ou telefones reais no código.
  Dados reais só em `scripts/dados.local.json` (ignorado pelo git) ou no banco.

## Validação
```bash
npm run typecheck && npm run lint && npm test && npm run build
DATABASE_URL=postgres://postgres:postgres@localhost/teste_agenda npm run test:db
```
