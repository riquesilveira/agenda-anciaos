/**
 * Sugere a sigla de um departamento a partir do nome.
 * Primeiro os nomes conhecidos (ASA, MM, DBV…); senão, as iniciais das
 * palavras importantes ("Ministério da Saúde" -> "MS"); com uma palavra só,
 * as 3 primeiras letras ("Música" -> "MUS").
 */
const CONHECIDAS: Record<string, string> = {
  "jovens": "JA",
  "ministerio jovem": "JA",
  "desbravadores": "DBV",
  "desbravador": "DBV",
  "aventureiros": "AVE",
  "aventureiro": "AVE",
  "ministerio da crianca": "MC",
  "infantil": "MC",
  "ministerio da mulher": "MM",
  "ministerio da familia": "MF",
  "escola sabatina": "ES",
  "ministerio pessoal": "MP",
  "musica": "MUS",
  "mordomia": "MOR",
  "acao solidaria": "ASA",
  "acao solidaria adventista": "ASA",
  "comunicacao": "COM",
  "secretaria": "SEC",
  "tesouraria": "TES",
  "diaconato": "DIA",
  "diaconia": "DIA",
  "saude": "SAU",
  "ministerio da saude": "SAU",
  "publicacoes": "PUB",
  "liberdade religiosa": "LR",
  "ministerio dos homens": "MH",
  "homens do reino": "MH",
  "ministerio do adolescente": "MA",
  "adolescentes": "MA",
};

const PEQUENAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "em", "para"]);

export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function sugerirSigla(nome: string): string {
  const n = normalizarNome(nome);
  if (!n) return "";
  if (CONHECIDAS[n]) return CONHECIDAS[n];
  const palavras = n.split(/[^a-z0-9]+/).filter((p) => p && !PEQUENAS.has(p));
  if (palavras.length === 0) return "";
  if (palavras.length === 1) return palavras[0].slice(0, 3).toUpperCase();
  return palavras
    .map((p) => p[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

/** Deixa a sigla no formato aceito: só letras/números, maiúsculas, até 6. */
export function limparSigla(sigla: string): string {
  return sigla
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}
