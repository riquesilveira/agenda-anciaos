import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GradeEscala } from "@/components/grade-escala";
import { AbasEscalas } from "@/components/abas-escalas";
import { departamentosComEquipe, listarDepartamentos, listarEscala, listarPerfis, nomeDaIgreja } from "@/lib/consultas";
import { dataCurta, hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { departamentosQueLidera, ehLideranca } from "@/lib/permissoes";
import { CULTOS, cultosDoMes, siglasAnciaos } from "@/lib/pregacao";
import {
  linkWhatsapp,
  ultimoDiaDoMes,
} from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import { assumirCulto } from "../acoes";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function EscalaPregacao({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const params = await searchParams;
  const { supabase, perfil } = await exigirPerfil();
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : hoje.slice(0, 7);
  const [escala, igreja, perfis, departamentos, comEquipe] = await Promise.all([
    listarEscala(supabase, `${mes}-01`, ultimoDiaDoMes(mes)),
    nomeDaIgreja(supabase),
    listarPerfis(supabase),
    listarDepartamentos(supabase),
    departamentosComEquipe(supabase),
  ]);
  const ancionato = perfis.filter((x) => ehLideranca(x));
  const siglas = siglasAnciaos(ancionato);
  const porChave = new Map(escala.map((e) => [`${e.data}|${e.culto}`, e]));
  const cultos = cultosDoMes(mes);
  const lideranca = ehLideranca(perfil);
  const inicio = parseISO(`${mes}-01`);
  const [nomeMes, ano] = maiuscula(nomeDoMes(mes)).split(" de ");

  const definidos = cultos.filter((c) => porChave.get(`${c.data}|${c.culto}`)?.pregador_nome).length;
  const textoEscala = [
    `📖 *Escala de pregação: ${maiuscula(nomeDoMes(mes))}*`,
    `${igreja}`,
    "",
    ...cultos.map((c) => {
      const e = porChave.get(`${c.data}|${c.culto}`);
      const quem = e?.pregador_nome ?? "a definir";
      return `${dataCurta(c.data)} · ${CULTOS[c.culto].curto}: ${quem}`;
    }),
  ].join("\n");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Escalas</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {nomeMes} <span className="font-normal text-slate-400">{ano}</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {mes !== hoje.slice(0, 7) && (
            <Link href={`/escalas?mes=${hoje.slice(0, 7)}`} className="botao-secundario px-3 py-1.5">Hoje</Link>
          )}
          <Link href={`/escalas?mes=${format(addMonths(inicio, -1), "yyyy-MM")}`} className="botao-secundario px-2 py-1.5" aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </Link>
          <Link href={`/escalas?mes=${format(addMonths(inicio, 1), "yyyy-MM")}`} className="botao-secundario px-2 py-1.5" aria-label="Próximo mês">
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>


      <AbasEscalas
        ativa="pregacao"
        departamentos={departamentos}
        comEquipe={comEquipe}
        editaveis={new Set(departamentosQueLidera(perfil, departamentos).map((d) => d.id))}
        podeAbrirOutros={lideranca}
      />

      <GradeEscala mes={mes} hoje={hoje} cultos={cultos} porChave={porChave} siglas={siglas} />

      {/* Legenda: sigla de cada ancião e sinais de situação */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
        {ancionato.map((a) => {
          const s = siglas.get(a.id)!;
          return (
            <span key={a.id} className="flex items-center gap-1.5">
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${s.cor}`}>
                {s.sigla}
              </span>
              {a.nome}
            </span>
          );
        })}
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-[10px] font-bold text-slate-400">?</span>
          sem responsável
        </span>
        <span className="text-slate-400">✓ pregador definido</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <span>
          <b>{definidos}</b> de <b>{cultos.length}</b> cultos com pregador definido
        </span>
        <a href={linkWhatsapp(null, textoEscala)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline">
          <MessageCircle size={16} /> Compartilhar escala
        </a>
      </div>

      <ul className="space-y-2">
        {cultos.map((c) => {
          const e = porChave.get(`${c.data}|${c.culto}`);
          const meu = e?.anciao_id === perfil.id;
          const passou = c.data < hoje;
          const d = parseISO(c.data);
          return (
            <li key={`${c.data}|${c.culto}`} className={passou ? "opacity-55" : ""}>
              <div className={`flex items-center gap-3 rounded-xl border bg-white p-2.5 shadow-sm ${meu ? "border-indigo-300" : "border-slate-200"}`}>
                <Link href={`/escalas/${c.data}/${c.culto}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={`flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5 ${c.culto === "sabado_manha" ? "bg-indigo-50" : "bg-slate-50"}`}>
                    <span className="text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
                      {format(d, "MMM", { locale: ptBR }).replace(".", "")}
                    </span>
                    <span className="text-2xl leading-none font-bold">{d.getDate()}</span>
                    <span className="text-[11px] text-slate-500">{DIAS[d.getDay()]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">{CULTOS[c.culto].curto}</p>
                    <p className={`truncate font-semibold ${e?.pregador_nome ? "text-slate-900" : "text-slate-400"}`}>
                      {e?.pregador_nome ?? "Pregador a definir"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {e ? (
                        <>
                          <span className="text-slate-500">
                            Resp.: {meu ? "você" : e.anciao?.nome ?? "—"}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">Sem ancião responsável</span>
                      )}
                    </div>
                  </div>
                </Link>
                {!e && lideranca && !passou && (
                  <form action={assumirCulto}>
                    <input type="hidden" name="data" value={c.data} />
                    <input type="hidden" name="culto" value={c.culto} />
                    <button className="botao px-3 py-1.5 text-xs">Assumir</button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-slate-500">
        {lideranca
          ? "Toque em “Assumir” para ficar responsável por um culto. Só o ancião responsável altera o pregador."
          : "A escala é montada pelo ancionato."}
      </p>
    </div>
  );
}
