"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Share, X } from "lucide-react";
import { removerInscricaoPush, salvarInscricaoPush, testarPush } from "@/app/(app)/acoes";

type Estado =
  | "carregando"
  | "sem-suporte" // navegador sem notificações
  | "iphone-sem-atalho" // iPhone fora do atalho da tela inicial
  | "desativado"
  | "ativado"
  | "bloqueado"; // a pessoa negou a permissão

const CHAVE_DISPENSADO = "agenda-notificacoes-dispensado";

function chaveVapid(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

function ehIphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function abertoPeloAtalho() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function nomeDoAparelho() {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac/i.test(ua)) return "Mac";
  return "Navegador";
}

async function registrar() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/**
 * modo "aviso": faixa no topo, só aparece enquanto não estiver ativado (pode ser dispensada).
 * modo "conta": controle completo na página Minha conta (ativar, testar, desativar).
 */
export function AtivarNotificacoes({ modo }: { modo: "aviso" | "conta" }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [dispensado, setDispensado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    try {
      setDispensado(localStorage.getItem(CHAVE_DISPENSADO) === "1");
    } catch {}
    (async () => {
      if (!chavePublica) return setEstado("sem-suporte");
      const temSuporte = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!temSuporte) return setEstado(ehIphone() && !abertoPeloAtalho() ? "iphone-sem-atalho" : "sem-suporte");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await registrar();
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) {
        // Garante que o servidor conhece este aparelho (ex: depois de trocar de usuário).
        await salvarInscricaoPush({ ...inscricao.toJSON(), endpoint: inscricao.endpoint, aparelho: nomeDoAparelho() });
        return setEstado("ativado");
      }
      setEstado("desativado");
    })().catch((e) => {
      setEstado("sem-suporte");
      setMensagem(`Erro ao preparar as notificações: ${e instanceof Error ? e.message : String(e)}`);
    });
  }, [chavePublica]);

  async function ativar() {
    setOcupado(true);
    setMensagem("");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desativado");
        return;
      }
      const reg = await registrar();
      await navigator.serviceWorker.ready;
      const inscricao =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveVapid(chavePublica!) }));
      const { ok, erro } = await salvarInscricaoPush({
        ...inscricao.toJSON(),
        endpoint: inscricao.endpoint,
        aparelho: nomeDoAparelho(),
      });
      if (!ok) throw new Error(erro ?? "falha ao salvar");
      setEstado("ativado");
      const { enviados } = await testarPush();
      setMensagem(enviados ? "Pronto! Enviamos uma notificação de teste." : "Ativado.");
    } catch (e) {
      // Mostra o motivo para dar para descobrir o problema por um print.
      const motivo = e instanceof Error ? `${e.name !== "Error" ? e.name + ": " : ""}${e.message}` : String(e);
      setMensagem(`Não foi possível ativar neste aparelho (${nomeDoAparelho()}). Motivo: ${motivo}`);
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    try {
      const reg = await registrar();
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) {
        await removerInscricaoPush(inscricao.endpoint);
        await inscricao.unsubscribe();
      }
      setEstado("desativado");
      setMensagem("Notificações desativadas neste aparelho.");
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    const { enviados } = await testarPush();
    setMensagem(enviados ? `Notificação de teste enviada para ${enviados} aparelho(s).` : "Nenhum aparelho ativado.");
    setOcupado(false);
  }

  function dispensar() {
    setDispensado(true);
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {}
  }

  // ---- faixa no topo ----
  if (modo === "aviso") {
    if (dispensado || !["desativado", "iphone-sem-atalho"].includes(estado)) return null;
    return (
      <div className="border-b border-indigo-200 bg-indigo-50">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2 text-sm text-indigo-900">
          <Bell size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            {estado === "iphone-sem-atalho" ? (
              <p>
                Para receber avisos de novas programações no iPhone: toque em <Share size={14} className="inline" />{" "}
                <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b> e abra a Agenda pelo ícone.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span>Receba um aviso no celular quando alguém cadastrar uma programação.</span>
                <button onClick={ativar} disabled={ocupado} className="botao px-3 py-1 text-xs">
                  {ocupado ? "Ativando…" : "🔔 Ativar notificações"}
                </button>
                {mensagem && <span className="text-xs">{mensagem}</span>}
              </div>
            )}
          </div>
          <button onClick={dispensar} className="rounded p-1 hover:bg-indigo-100" aria-label="Dispensar">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ---- página Minha conta ----
  return (
    <section className="cartao space-y-3">
      <h2 className="font-semibold">Notificações neste aparelho</h2>
      {estado === "carregando" && <p className="text-sm text-slate-500">Verificando…</p>}
      {estado === "sem-suporte" && (
        <p className="text-sm text-slate-600">Este navegador não aceita notificações. No celular, use o Chrome (Android) ou o Safari (iPhone).</p>
      )}
      {estado === "iphone-sem-atalho" && (
        <p className="text-sm text-slate-600">
          No iPhone: toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra a Agenda pelo ícone e volte aqui.
        </p>
      )}
      {estado === "bloqueado" && (
        <p className="text-sm text-slate-600">
          As notificações foram bloqueadas neste aparelho. Libere nas configurações do navegador (ou do celular, em
          Notificações → Agenda) e recarregue a página.
        </p>
      )}
      {estado === "desativado" && (
        <button onClick={ativar} disabled={ocupado} className="botao">
          <Bell size={16} /> {ocupado ? "Ativando…" : "Ativar notificações"}
        </button>
      )}
      {estado === "ativado" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-emerald-700">✅ Ativadas</span>
          <button onClick={testar} disabled={ocupado} className="botao-secundario">Enviar teste</button>
          <button onClick={desativar} disabled={ocupado} className="botao-secundario">
            <BellOff size={16} /> Desativar
          </button>
        </div>
      )}
      {mensagem && <p className="text-sm text-slate-600">{mensagem}</p>}
    </section>
  );
}
