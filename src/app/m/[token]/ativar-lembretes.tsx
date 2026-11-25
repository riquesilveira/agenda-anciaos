"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Share } from "lucide-react";
import { abertoPeloAtalho, chaveVapid, ehIphone, nomeDoAparelho } from "@/components/ativar-notificacoes";
import { ehVersaoAntiga, recarregarUmaVez } from "@/components/versao-nova";
import { ativarLembretesAssociado, desativarLembretesAssociado } from "./acoes";

type Estado = "carregando" | "sem-suporte" | "iphone-sem-atalho" | "desativado" | "ativado" | "bloqueado";

async function registrar() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** Botão "Ativar lembretes" do link pessoal do associado. */
export function AtivarLembretes({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      if (!chavePublica) return setEstado("sem-suporte");
      const temSuporte = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!temSuporte) return setEstado(ehIphone() && !abertoPeloAtalho() ? "iphone-sem-atalho" : "sem-suporte");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await registrar();
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao && Notification.permission === "granted") {
        // Garante que este aparelho está ligado a este associado.
        await ativarLembretesAssociado(token, { ...inscricao.toJSON(), aparelho: nomeDoAparelho() });
        return setEstado("ativado");
      }
      setEstado("desativado");
    })().catch(() => setEstado("sem-suporte"));
  }, [chavePublica, token]);

  async function ativar() {
    setOcupado(true);
    setMensagem("");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado(permissao === "denied" ? "bloqueado" : "desativado");
      const reg = await registrar();
      await navigator.serviceWorker.ready;
      const inscricao =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveVapid(chavePublica!) }));
      const { ok, erro } = await ativarLembretesAssociado(token, { ...inscricao.toJSON(), aparelho: nomeDoAparelho() });
      if (!ok) throw new Error(erro ?? "falha ao salvar");
      setEstado("ativado");
      setMensagem("Pronto! Você vai receber um lembrete na véspera de cada dia seu na escala.");
    } catch (e) {
      if (ehVersaoAntiga(e) && recarregarUmaVez()) return;
      setMensagem(`Não foi possível ativar neste aparelho. ${e instanceof Error ? e.message : ""}`);
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    try {
      const reg = await registrar();
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) await desativarLembretesAssociado(token, inscricao.endpoint);
      setEstado("desativado");
      setMensagem("Lembretes desativados neste aparelho.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="cartao space-y-3">
      {estado === "carregando" && <p className="text-sm text-slate-500">Verificando…</p>}
      {estado === "desativado" && (
        <>
          <p className="text-sm text-slate-600">Receba um aviso no celular na véspera de cada dia seu na escala.</p>
          <button onClick={ativar} disabled={ocupado} className="botao w-full py-3 text-base">
            <Bell size={18} /> {ocupado ? "Ativando…" : "Ativar lembretes"}
          </button>
        </>
      )}
      {estado === "ativado" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-emerald-700">✅ Lembretes ativados neste celular</span>
          <button onClick={desativar} disabled={ocupado} className="botao-secundario px-3 py-1.5 text-xs">
            <BellOff size={14} /> Desativar
          </button>
        </div>
      )}
      {estado === "iphone-sem-atalho" && (
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-medium">No iPhone, falta um passo para ativar os lembretes:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Toque em <Share size={14} className="inline" /> <b>Compartilhar</b> (embaixo, no Safari).
            </li>
            <li>
              Escolha <b>Adicionar à Tela de Início</b>.
            </li>
            <li>
              Abra o ícone <b>Minha escala</b> que apareceu e toque em <b>Ativar lembretes</b>.
            </li>
          </ol>
        </div>
      )}
      {estado === "bloqueado" && (
        <p className="text-sm text-slate-600">
          As notificações estão bloqueadas neste celular. Libere nas configurações do navegador e abra o link de novo.
        </p>
      )}
      {estado === "sem-suporte" && (
        <p className="text-sm text-slate-600">
          Este navegador não aceita lembretes. No celular, abra o link no Chrome (Android) ou no Safari (iPhone).
        </p>
      )}
      {mensagem && <p className="text-sm text-slate-600">{mensagem}</p>}
    </section>
  );
}
