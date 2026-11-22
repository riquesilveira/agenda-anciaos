# PRD: Agenda dos Anciãos, Igreja do Aeroporto (v1)

## Problema
As programações da igreja vêm de três fontes: **Associação**, **distrito** e
**igreja local**. Hoje elas não estão num lugar só, e isso causa:

1. **Duplicidade ou choque:** o distrito ou a igreja marca algo na mesma data
   de uma programação da Associação.
2. **Líder esquecido:** o líder do departamento não fica sabendo, ou lembra em
   cima da hora. O ancião responsável não tem uma visão clara do que precisa cobrar.

## Objetivo
Um calendário único em que todos os anciãos e o pastor veem todas as
programações, e cada ancião é lembrado com antecedência de avisar os líderes
dos departamentos pelos quais é responsável:

> **Ancião Henrique**, em dezembro temos as seguintes programações:
> • **12/12 (sáb) 19h**: Culto Jovem (Jovens)
>   Você é o ancião responsável por Jovens: lembre Ana (líder de Jovens) sobre esta programação.
>   ⚠️ Líder ainda não avisado (faltam 20 dias)

## Usuários
| Quem | Acesso |
|---|---|
| 3 anciãos | Login. Veem tudo, cadastram e editam qualquer programação. Recebem o resumo dos seus departamentos. |
| Pastor | Login. Igual aos anciãos e recebe o resumo de todos os departamentos. |
| Líderes de departamento | Sem login. São só nome + WhatsApp no cadastro do departamento. |

O pastor atende outras igrejas do distrito, mas a v1 é **só a Igreja do
Aeroporto**. O banco já tem `igreja_id` em tudo, então abrir para outras
igrejas depois não exige reescrever nada.

## Funcionalidades (v1)
| # | Funcionalidade | Status |
|---|---|---|
| 1 | Calendário mensal + lista, com cor por origem e filtro por departamento e origem | ✅ |
| 2 | Cadastro e edição de programação (título, data, horário, local, origem, departamento, descrição) | ✅ |
| 3 | Aviso de conflito (mesmo departamento no período, Associação no período, mesmo local e horário). É aviso, não bloqueio. Campanhas da Associação com mais de 3 dias não geram aviso | ✅ |
| 4 | Departamentos com ancião responsável e líder (nome + WhatsApp) | ✅ |
| 5 | "Minhas programações": resumo dos próximos 30 dias e do mês | ✅ |
| 6 | "Avisei o líder": marcar ou desmarcar, com quem marcou e quando | ✅ |
| 7 | Botão de WhatsApp com a mensagem pronta para o líder | ✅ |
| 8 | E-mail automático: resumo mensal (dia 1º) e semanal (toda segunda) | ✅ |
| 9 | Importar o calendário da Associação a partir do PDF anual (com ligação automática a departamentos) | ✅ |
| 11 | Programações de vários dias (Missão Calebe, 40 Dias de Oração…) | ✅ |
| 12 | Tratamento configurável por pessoa nos resumos (Ancião, Anciã, Pastor…) | ✅ |
| 10 | Histórico de quem criou e quem alterou | ✅ |

### Regra dos lembretes
"1 mês antes e depois toda semana":
- **Resumo semanal** (segunda): tudo dos seus departamentos nos **próximos 30 dias**.
  Cada programação aparece cerca de 4 vezes antes da data, sem configuração por evento.
- **Resumo mensal** (dia 1º): tudo do mês.
- Depois de "avisei o líder", a programação continua no resumo, marcada como ✅.

### Calendário da Associação
Chega em **PDF** (grade mensal, cor = origem: ANP, USB, DSA, Nacional,
Comissões). `scripts/extrair-calendario-pdf.py` converte para JSON e
`npm run importar` grava. O resumo do pastor não inclui eventos da Associação
sem departamento (são ~90 por ano e afogariam o resumo); eles aparecem no calendário.

## Fora da v1
- Importar do Google Agenda (ainda não se sabe se o calendário da Associação chega por lá)
- Outras igrejas do distrito
- Login para líderes de departamento
- WhatsApp automático (API oficial é paga)
- Inscrições e lista de presença
- Programações recorrentes (cultos semanais)

## Stack
Next.js 15 (App Router) + Supabase (Auth + Postgres + RLS) + Resend (e-mail) +
Vercel (hospedagem + Cron). Tudo cabe nos planos gratuitos.
