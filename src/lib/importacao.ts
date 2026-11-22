/**
 * Regras para importar o calendário da Associação: a qual departamento da
 * igreja cada evento pertence (por palavras-chave no título).
 *
 * Os nomes de departamento abaixo são apelidos: o evento vai para o primeiro
 * departamento cadastrado cujo nome bater com algum apelido. Se a igreja não
 * tiver aquele departamento, o evento entra sem departamento (aparece no
 * calendário, mas não no resumo de ninguém). Dá para ajustar depois no app.
 */

export interface EventoImportado {
  data: string;
  data_fim: string | null;
  titulo: string;
  titulo_original: string;
  fonte: string;
}

interface Regra {
  departamentos: string[];
  padrao: RegExp;
}

/** Eventos de pastores/administração: importados, mas sem departamento. */
const SO_LIDERANCA =
  /PASTOR|PAMP|PGP|ADMINISTRADOR|OBREIROS|FUNCIONARIOS|JUBILADOS|ASPIRANTES|PLENARIA|CONCILIO ANUAL|GEPEA|CADE|ENTREVISTA|COLPORTORES PERMANENTES|PSICOLOGOS|PEDAGOGICO|ADMINISTRATIVO|PASTORAL ESCOLAR|DEVOLUTIVA|COMISSAO|IN MISSION|POS MENTORIA/;

const REGRAS: Regra[] = [
  { departamentos: ["desbravadores", "dbv", "clube de desbravadores"], padrao: /\bDBV\b|DESBRAVADOR|CAMPORI|MASTER AVANCADO/ },
  { departamentos: ["aventureiros", "clube de aventureiros"], padrao: /AVENTUR/ },
  {
    departamentos: ["jovens", "ja", "ministerio jovem", "mja"],
    padrao: /\bJA\b|\bMJA\b|JOVE|CALEBE|UNIVERSITARIO|ESTUDANTES|SEND ME|MISSAO ALBANIA/,
  },
  {
    departamentos: ["infantil", "ministerio da crianca", "crianca", "mca", "criancas", "adolescentes"],
    padrao: /CRIANCA|ESCOLA CRISTA DE FERIAS|\bMC\b|\bMCA\b|TEEN/,
  },
  { departamentos: ["ministerio da mulher", "mulher", "mm"], padrao: /\bMM\b|MULHER|FEMININA/ },
  {
    departamentos: ["ministerio da familia", "familia", "mf"],
    padrao: /FAMILIA|\bMF\b|NOIVOS|CASAIS|ADORACAO EM FAMILIA/,
  },
  { departamentos: ["musica", "ministerio da musica", "louvor"], padrao: /MUSICA|MUSICAIS/ },
  { departamentos: ["escola sabatina", "es"], padrao: /ESCOLA SABATINA|13º SABADO/ },
  { departamentos: ["mordomia", "mordomia crista"], padrao: /MORDOMIA|EDMC|EMPREENDEDORES/ },
  { departamentos: ["acao solidaria", "asa", "acao solidaria adventista"], padrao: /\bASA\b|MUTIRAO DE NATAL|QUEBRANDO O SILENCIO/ },
  { departamentos: ["comunicacao"], padrao: /COMUNICA/ },
  { departamentos: ["homens", "ministerio dos homens", "homens do reino"], padrao: /HOMENS DO REINO|MINISTERIO DO HOMEM/ },
  { departamentos: ["saude", "ministerio da saude"], padrao: /SAUDE|COZINHA/ },
  { departamentos: ["secretaria", "secretaria da igreja"], padrao: /SECRETARI/ },
  { departamentos: ["ancionato", "anciaos"], padrao: /ANCIONATO/ },
  { departamentos: ["publicacoes", "colportagem"], padrao: /COLPORT|\bMANA\b/ },
  {
    departamentos: ["ministerio pessoal", "evangelismo", "mp"],
    padrao: /EVANGELISMO|MINISTERIO PESSOAL|\bMP\b|ESTUDOS BIBLICOS|SEMEADURA|BATISMO|RECOLTA|NOVO TEMPO|PLANTIO|REAVIVAMENTO|ORACAO|CLAMOR|ACOLHEDORA|SANTA CONVOCACAO|I WILL GO/,
  },
];

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Devolve o id do departamento sugerido para o evento, ou null. */
export function sugerirDepartamento(
  titulo: string,
  departamentos: { id: string; nome: string }[],
): string | null {
  const t = normalizar(titulo);
  if (SO_LIDERANCA.test(t)) return null;

  const porNome = new Map(departamentos.map((d) => [normalizar(d.nome), d.id]));
  for (const regra of REGRAS) {
    if (!regra.padrao.test(t)) continue;
    for (const apelido of regra.departamentos) {
      const id = porNome.get(normalizar(apelido));
      if (id) return id;
    }
  }
  return null;
}

/** Fonte legível: "NACIONAL" -> "Nacional", siglas ficam como estão. */
export function fonteLegivel(fonte: string): string {
  if (fonte === "NACIONAL") return "Nacional";
  if (fonte === "COMISSÕES") return "Comissões";
  return fonte;
}

/** Chave estável: importar de novo o mesmo arquivo não duplica nada. */
export function chaveImportacao(ano: number, e: Pick<EventoImportado, "data" | "titulo_original" | "fonte">): string {
  const slug = normalizar(e.titulo_original).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `associacao-${ano}:${e.fonte.toLowerCase()}:${e.data}:${slug}`;
}
