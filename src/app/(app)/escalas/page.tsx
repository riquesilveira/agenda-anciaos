import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GradeEscala } from "@/components/grade-escala";
import { AbasEscalas } from "@/components/abas-escalas";
import { CompartilharImagem } from "@/components/compartilhar-imagem";
import { CabecalhoMes, Moldura, TituloLateral } from "@/components/moldura";
import { departamentosComEquipe, listarDepartamentos, listarEscala, listarPerfis, nomeDaIgreja } from "@/lib/consultas";
import { hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { textoEscalaWhatsapp } from "@/lib/escalas";
import { departamentosQueLidera, ehLideranca } from "@/lib/permissoes";
import { cultosComEspeciais, nomeDoCulto, siglasAnciaos } from "@/lib/pregacao";
import { ultimoDiaDoMes } from "@/lib/resumo";
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
  const cultos = cultosComEspeciais(mes, escala);
  const lideranca = ehLideranca(perfil);

  const definidos = cultos.filter((c) => porChave.get(`${c.data}|${c.culto}`)?.pregador_nome).length;

  const abas = (
    <AbasEscalas
      ativa="pregacao"
      departamentos={departamentos}
      comEquipe={comEquipe}
      editaveis={new Set(departamentosQueLidera(perfil, departamentos).map((d) => d.id))}
      podeAbrirOutros={lideranca}
    />
  );
  // Legenda: sigla de cada ancião e o sinal de "sem responsável".
  const legenda = (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700 lg:flex-col lg:gap-2">
      {ancionato.map((a) => {
        const s = siglas.get(a.id)!;
        return (
          <li key={a.id} className="flex items-center gap-2">
            <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${s.cor}`}>{s.sigla}</span>
            {a.nome}
          </li>
        );
      })}
      <li className="flex items-center gap-2 text-slate-500">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-[10px] font-bold text-slate-400">?</span>
        sem responsável
      </li>
    </ul>
  );
  const linhasEscala = cultos.map((c) => {
    const e = porChave.get(`${c.data}|${c.culto}`);
    return { data: c.data, titulo: nomeDoCulto({ culto: c.culto, titulo: e?.titulo }), nomes: e?.pregador_nome ? [e.pregador_nome] : [] };
  });
  const resumo = (
    <div className="space-y-2 text-sm">
      <p>
        <b>{definidos}</b> de <b>{cultos.length}</b> cultos com pregador definido
      </p>
      <CompartilharImagem
        titulo="Escala de pregação"
        mes={maiuscula(nomeDoMes(mes))}
        igreja={igreja}
        linhas={linhasEscala}
        texto={textoEscalaWhatsapp({
          titulo: "Escala de pregação",
          emoji: "📖",
          marcador: "🎤",
          mes: maiuscula(nomeDoMes(mes)),
          igreja,
          linhas: linhasEscala,
        })}
        arquivo={`escala-pregacao-${mes}.png`}
        rotulo="Compartilhar a escala"
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <Moldura
        lateral={
          <>
            <div className="space-y-2">
              <TituloLateral>Anciãos</TituloLateral>
              {legenda}
            </div>
            <div className="border-t border-slate-200 pt-5">{resumo}</div>
          </>
        }
      >
        <CabecalhoMes
          mes={mes}
          link={(m) => `/escalas?mes=${m}`}
          direita={<span className="hidden text-sm font-medium text-slate-500 sm:inline">Escala de pregação</span>}
        />
        <div className="px-4 pb-3 sm:px-5">{abas}</div>
        <div className="space-y-3 px-4 pb-3 lg:hidden">
          {legenda}
          {resumo}
        </div>
        <GradeEscala mes={mes} hoje={hoje} cultos={cultos} porChave={porChave} siglas={siglas} podeAdicionar={lideranca} />
      </Moldura>

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
                    <p className="text-xs font-medium text-slate-500">{nomeDoCulto({ culto: c.culto, titulo: e?.titulo }, true)}</p>
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
