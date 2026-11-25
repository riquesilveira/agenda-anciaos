# PRD: IASD Agenda, Igreja do Aeroporto (v1)

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
| Líderes de departamento | Login por convite (link enviado pelo ancião no WhatsApp). Veem o calendário todo, mas só criam/editam/excluem programações locais dos departamentos que lideram. Sem aprovação. |

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

### Aviso de nova programação
Quem cria uma programação vê o botão "Avisar no WhatsApp" (mensagem pronta,
a pessoa escolhe o grupo dos líderes). Todos da igreja veem em **Novidades**
(com contador no menu) e recebem e-mail automático quando `RESEND_API_KEY`
estiver configurada.

### Escala de pregação
Cultos: sábado de manhã, quarta e domingo à noite (todos os do mês aparecem
automaticamente). Um ancião (ou o pastor) **assume** o culto e vira o
responsável; **só ele** edita pregador, WhatsApp, igreja de origem, tema,
situação do convite (a convidar → convidado → confirmado / recusou) e
observações, pode passar para outro ancião ou liberar. Botões de WhatsApp com
mensagem pronta de **convite** e de **lembrete**, e "Compartilhar escala" do mês.
Todos da igreja veem a escala. Regras garantidas no RLS (`escala_pregacao`).

### Escalas dos departamentos
Música, Sonoplastia, Diaconato… O líder cadastra a **equipe** (associados sem
login, com WhatsApp) e monta os **dias da escala em qualquer data**, com
várias pessoas e a função de cada uma. Quadro interativo: arrastar o nome
até o dia (computador) ou tocar no nome e no dia (celular). Botão **Avisar**
abre o WhatsApp do próprio líder com a mensagem pronta e marca como avisado.
**Avisar todos** passa pelos pendentes do dia um por um, e o atalho
"Amanhã: N para avisar" abre direto o dia. Às 18h da véspera o líder (ou,
sem líder com login, o ancião responsável) recebe uma notificação no celular
com quem falta avisar (`/api/cron/tick`, chamado pelo keep-alive; roda uma vez
por dia graças à tabela `execucoes_agendadas`).
**Lembretes automáticos para associados:** cada associado tem um link pessoal
(`/m/<token>`, sem login) que o líder envia pelo WhatsApp (ícone do sino na
equipe). Ali a pessoa ativa as notificações no celular e confirma ("Confirmo" /
"Não vou poder") os próximos dias. Quem ativou recebe o lembrete às 18h da
véspera, fica marcado como avisado e sai da lista "para avisar" do líder. Uma
recusa notifica o líder na hora.
**Fotos:** cada pessoa põe a própria foto em Minha conta; o associado que tem
conta no sistema aparece na escala com a foto da conta (casado pelo WhatsApp ou,
sem ele, pelo nome único). Não há envio de foto na escala. Storage, bucket
público "fotos" (`perfis/<id>.jpg`), reduzida no aparelho para 320px. Sem foto,
aparecem as iniciais.
**Trocar pessoa no dia:** no painel do dia, "Trocar" substitui quem foi escalado
(o aviso recomeça para a nova pessoa); fica em destaque quando a pessoa
respondeu "Não vou poder".
**Culto especial na pregação:** além dos cultos fixos (quarta, sábado de manhã,
domingo à noite), qualquer dia pode ter um culto especial com nome próprio
(semana de oração, Santa Ceia…): o "+" no dia da grade abre o cadastro.
**Escala em imagem:** "Compartilhar" gera uma imagem da escala do mês no
próprio aparelho (`html-to-image`, em `components/compartilhar-imagem.tsx`) e
abre o compartilhar do celular; no computador, baixa o arquivo. Não gerar no
servidor: no plano free do Render isso trava o processo e derruba o site.
**Mensagem padrão do aviso:** cada departamento pode ter o próprio texto do
botão Avisar (tabela `escala_mensagens`), com marcadores {nome}, {quando},
{data}, {horario}, {programacao}, {funcao}, {departamento}. Sem texto próprio,
vale a mensagem do sistema. O WhatsApp do associado aceita qualquer formato e é
salvo como "(43) 99999-9999"; sem DDD, usa o do líder (ou o mais comum na equipe).
**Link de entrada para líderes:** um link único do 7Líder (`/entrar`, também no
login como "Criar meu acesso"). A pessoa escolhe a igreja e os departamentos que
lidera e cria o acesso (e-mail/senha ou Google, quando ligado no Supabase); entra
na hora como líder. O ancionato daquela igreja recebe uma notificação e vê
"Entraram pelo link" em Departamentos, com "Remover acesso". O card em
Departamentos manda o link já com a igreja escolhida (`/entrar?igreja=<id>`).
O convite individual continua existindo.
Todos veem; editam o líder do departamento e anciãos/pastor (RLS).

## Fora da v1
- Importar do Google Agenda (ainda não se sabe se o calendário da Associação chega por lá)
- Outras igrejas do distrito
- WhatsApp automático (API oficial é paga)
- Inscrições e lista de presença
- Programações recorrentes (cultos semanais)

## Stack
Next.js 15 (App Router) + Supabase (Auth + Postgres + RLS) + Resend (e-mail).
Site hospedado no **Render** (mesma conta do Helsis); resumos agendados pelo
**GitHub Actions**. Tudo cabe nos planos gratuitos.
