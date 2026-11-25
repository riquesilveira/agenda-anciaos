import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { dataLonga, horaCurta, hojeISO, maiuscula } from "@/lib/datas";
import { quandoE } from "@/lib/escalas";
import { responderEscala } from "./acoes";
import { AtivarLembretes } from "./ativar-lembretes";
import { associadoPorToken, proximosDias } from "./dados";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Minha escala",
    manifest: `/m/${token}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: "Minha escala", statusBarStyle: "default" },
    robots: { index: false, follow: false },
  };
}

/** Link pessoal do associado (sem login): ativa lembretes e confirma os dias. */
export default async function MinhaEscala({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const associado = await associadoPorToken(token);
  if (!associado) notFound();
  const dias = await proximosDias(associado.id);
  const hoje = hojeISO();
  const dep = associado.departamento;

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <header>
        <p className="text-sm font-medium text-indigo-700">
          {dep.nome}
          {dep.igreja ? ` · ${dep.igreja.nome}` : ""}
        </p>
        <h1 className="text-2xl font-bold">Olá, {associado.nome}!</h1>
      </header>

      <AtivarLembretes token={token} />

      <section className="space-y-2">
        <h2 className="font-semibold">Seus próximos dias</h2>
        {dias.length === 0 && <p className="cartao text-sm text-slate-500">Nenhum dia marcado na escala por enquanto.</p>}
        {dias.map((d) => {
          const detalhes = [d.dia.titulo, d.dia.horario ? horaCurta(d.dia.horario) : null, d.funcao].filter(Boolean).join(" · ");
          const quando = quandoE(d.dia.data, hoje);
          return (
            <div key={d.id} className="cartao space-y-2">
              <div>
                <p className="font-semibold">
                  {maiuscula(dataLonga(d.dia.data))}
                  {quando === "hoje" || quando === "amanhã" ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{quando}</span>
                  ) : null}
                </p>
                {detalhes && <p className="text-sm text-slate-600">{detalhes}</p>}
                {d.dia.observacao && <p className="mt-1 text-sm whitespace-pre-wrap text-slate-500">{d.dia.observacao}</p>}
              </div>
              <form action={responderEscala} className="flex gap-2">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="id" value={d.id} />
                <button
                  name="resposta"
                  value="confirmado"
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium ${
                    d.resposta === "confirmado"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500"
                  }`}
                >
                  <Check size={16} /> {d.resposta === "confirmado" ? "Confirmado" : "Confirmo"}
                </button>
                <button
                  name="resposta"
                  value="recusado"
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium ${
                    d.resposta === "recusado"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-red-400"
                  }`}
                >
                  <X size={16} /> Não vou poder
                </button>
              </form>
            </div>
          );
        })}
      </section>
      <p className="text-center text-xs text-slate-400">Este link é só seu. Guarde para ver sua escala quando quiser.</p>
    </main>
  );
}
