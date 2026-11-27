// Espelho das tabelas em supabase/migrations. Toda coluna/relacionamento novo
// no banco precisa de um campo aqui.

export type Papel = "anciao" | "pastor" | "lider";
export type Origem = "associacao" | "distrito" | "local";

export const ORIGENS: Record<
  Origem,
  {
    nome: string;
    classe: string;
    barra: string;
    ponto: string;
    fundoData: string;
    textoData: string;
    /** Etiqueta do evento no calendário (fundo claro + barrinha à esquerda). */
    etiqueta: string;
  }
> = {
  associacao: {
    nome: "Associação",
    classe: "bg-violet-100 text-violet-800 border-violet-300",
    barra: "border-l-violet-500",
    ponto: "bg-violet-500",
    fundoData: "bg-violet-50",
    textoData: "text-violet-700",
    etiqueta: "bg-violet-50 text-violet-800 border-l-violet-500 hover:bg-violet-100",
  },
  distrito: {
    nome: "Distrito",
    classe: "bg-amber-100 text-amber-900 border-amber-300",
    barra: "border-l-amber-500",
    ponto: "bg-amber-500",
    fundoData: "bg-amber-50",
    textoData: "text-amber-700",
    etiqueta: "bg-amber-50 text-amber-900 border-l-amber-500 hover:bg-amber-100",
  },
  local: {
    nome: "Local",
    classe: "bg-sky-100 text-sky-800 border-sky-300",
    barra: "border-l-sky-500",
    ponto: "bg-sky-500",
    fundoData: "bg-sky-50",
    textoData: "text-sky-700",
    etiqueta: "bg-sky-50 text-sky-800 border-l-sky-500 hover:bg-sky-100",
  },
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
  /** Quando entrou sozinho pelo link de entrada da igreja (null = convidado). */
  entrou_pelo_link_em: string | null;
  /** Foto (Storage "fotos"/perfis/<id>.jpg). */
  foto_url: string | null;
  /** Pediu acesso de ancião pelo link de entrada (aguarda aprovação). */
  pedido_anciao_em: string | null;
  /** Cor na grade da escala (laranja, verde_escuro, rosa…). */
  cor: string | null;
}

/** Líder (com login) de um departamento. */
export interface LiderDepartamento {
  perfil_id: string;
  perfil?: Pick<Perfil, "id" | "nome" | "email" | "whatsapp" | "papel" | "tratamento"> | null;
}

export interface Igreja {
  id: string;
  nome: string;
  /** Código do link de entrada para líderes (/entrar/<código>). */
  codigo_entrada: string;
  /** Igrejas com o mesmo distrito veem as programações do distrito umas das outras. */
  distrito: string | null;
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

/** "especial" vale em qualquer dia e tem nome próprio em `titulo`. */
export type CultoPregacao = "sabado_manha" | "quarta" | "domingo_noite" | "especial";
export type StatusPregacao = "a_convidar" | "convidado" | "confirmado" | "recusou";

export interface Pregacao {
  id: string;
  igreja_id: string;
  data: string; // yyyy-MM-dd
  culto: CultoPregacao;
  /** Nome do culto especial (ex: Semana de Oração). */
  titulo: string | null;
  /** Horário do culto (opcional). */
  horario: string | null;
  anciao_id: string;
  pregador_nome: string | null;
  pregador_whatsapp: string | null;
  pregador_igreja: string | null;
  tema: string | null;
  status: StatusPregacao;
  observacoes: string | null;
  anciao?: Pick<Perfil, "id" | "nome" | "papel" | "tratamento"> | null;
}

/** Associado de um departamento (sem login), ex: músico, sonoplasta, diácono. */
export interface MembroDepartamento {
  id: string;
  departamento_id: string;
  nome: string;
  whatsapp: string | null;
  ativo: boolean;
  /** Link pessoal do associado: /m/<token>. */
  token: string;
  /** Quando ativou os lembretes no celular (null = não ativou). */
  lembretes_ativos_em: string | null;
  /** Foto enviada pelo líder (Storage "fotos"/membros/<id>.jpg). */
  foto_url: string | null;
}

/** Pessoa escalada num dia, com a função dela. */
export interface EscalaDiaPessoa {
  id: string;
  escala_dia_id: string;
  membro_id: string;
  funcao: string | null;
  avisado_em: string | null;
  ordem: number;
  resposta: "confirmado" | "recusado" | null;
  respondido_em: string | null;
  /** Quando o lembrete automático (notificação) foi entregue. */
  lembrete_enviado_em: string | null;
  membro?: MembroDepartamento | null;
}

/** Um dia da escala de um departamento (qualquer data). */
export interface EscalaDia {
  id: string;
  departamento_id: string;
  data: string;
  horario: string | null;
  titulo: string | null;
  observacao: string | null;
  pessoas?: EscalaDiaPessoa[];
}

/** Mensagem padrão do aviso da escala de um departamento (escrita pelo líder). */
export interface EscalaMensagem {
  departamento_id: string;
  /** Texto com marcadores: {nome}, {quando}, {data}, {horario}, {programacao}, {funcao}, {departamento}. */
  texto: string;
  updated_at: string;
}

/** Igrejas que uma pessoa pode abrir (além da atual, em perfis.igreja_id). */
export interface PerfilIgreja {
  perfil_id: string;
  igreja_id: string;
}
