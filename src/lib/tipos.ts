// Espelho das tabelas em supabase/migrations. Toda coluna/relacionamento novo
// no banco precisa de um campo aqui.

export type Papel = "anciao" | "pastor" | "lider";
export type Origem = "associacao" | "distrito" | "local";

export const ORIGENS: Record<Origem, { nome: string; classe: string }> = {
  associacao: { nome: "Associação", classe: "bg-violet-100 text-violet-800 border-violet-300" },
  distrito: { nome: "Distrito", classe: "bg-amber-100 text-amber-900 border-amber-300" },
  local: { nome: "Local", classe: "bg-sky-100 text-sky-800 border-sky-300" },
};

export interface Perfil {
  id: string;
  igreja_id: string;
  nome: string;
  papel: Papel;
  email: string;
  whatsapp: string | null;
  /** "Ancião", "Anciã", "Pastor"… Vazio = padrão pelo papel. */
  tratamento: string | null;
  /** Até quando a pessoa já viu as programações criadas pelos outros. */
  novidades_vistas_em: string;
}

/** Líder (com login) de um departamento. */
export interface LiderDepartamento {
  perfil_id: string;
  perfil?: Pick<Perfil, "id" | "nome" | "email" | "whatsapp" | "papel" | "tratamento"> | null;
}

export interface Departamento {
  id: string;
  igreja_id: string;
  nome: string;
  /** ASA, MM, DBV… (até 6 letras/números). */
  sigla: string | null;
  cor: string;
  anciao_id: string | null;
  lider_nome: string | null;
  lider_whatsapp: string | null;
  anciao?: Pick<Perfil, "id" | "nome"> | null;
  lideres?: LiderDepartamento[];
}

export interface Programacao {
  id: string;
  igreja_id: string;
  titulo: string;
  descricao: string | null;
  data: string; // yyyy-MM-dd (início)
  data_fim: string | null; // yyyy-MM-dd; null = um dia só
  hora_inicio: string | null; // HH:mm[:ss]
  hora_fim: string | null;
  local: string | null;
  origem: Origem;
  /** Detalhe da origem vindo da importação: ANP, USB, DSA, NACIONAL… */
  fonte: string | null;
  chave_importacao: string | null;
  departamento_id: string | null;
  lider_avisado_em: string | null;
  lider_avisado_por: string | null;
  criado_por: string | null;
  atualizado_por: string | null;
  created_at: string;
  departamento?: Departamento | null;
}
