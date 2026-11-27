import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { googleAtivo } from "@/lib/google";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { igrejasParaEntrada } from "./dados";
import { FormEntrada } from "./form-entrada";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar · 7Líder", robots: { index: false, follow: false } };

/** Link de entrada do 7Líder (público): o líder escolhe a igreja e cria a própria conta. */
export default async function Entrar({ searchParams }: { searchParams: Promise<{ igreja?: string }> }) {
  const { igreja: igrejaInicial } = await searchParams;
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Quem já tem acesso vai direto para a agenda. Quem voltou do Google sem
  // perfil completa o cadastro aqui.
  let contaGoogle: { nome: string; email: string } | null = null;
  if (user) {
    const { data: perfil } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
    if (perfil) redirect("/");
    const m = user.user_metadata as { full_name?: string; name?: string };
    contaGoogle = { nome: m.full_name ?? m.name ?? "", email: user.email ?? "" };
  }

  const [igrejas, google] = await Promise.all([igrejasParaEntrada(), googleAtivo()]);

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* ----- Esquerda: logo e texto ----- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-10 text-white lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-md space-y-5 lg:mx-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icones/icone-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl shadow-lg ring-2 ring-white/30" />
            <span className="text-lg font-bold tracking-tight">7Líder</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl leading-tight font-bold lg:text-4xl">Bem-vindo ao 7Líder</h1>
            <p className="text-indigo-100">
              Crie seu acesso de líder ou ancião para acompanhar a agenda da igreja, montar as escalas e cadastrar as programações.
            </p>
          </div>
          <ul className="hidden space-y-2.5 text-sm text-indigo-50 lg:block">
            <li className="flex gap-2.5"><span>📅</span> Calendário da igreja, do distrito e da Associação num lugar só</li>
            <li className="flex gap-2.5"><span>👥</span> Escala da equipe com aviso pelo WhatsApp</li>
            <li className="flex gap-2.5"><span>🔔</span> Lembretes no celular para você e para a equipe</li>
          </ul>
        </div>
      </section>

      {/* ----- Direita: formulário ----- */}
      <section className="flex items-start justify-center px-4 py-8 lg:items-center lg:px-10">
        <div className="w-full max-w-md space-y-4">
          <h2 className="hidden text-xl font-semibold text-slate-900 lg:block">Criar meu acesso</h2>
          <FormEntrada igrejas={igrejas} igrejaInicial={igrejaInicial} google={google} contaGoogle={contaGoogle} />
          <p className="text-center text-sm text-slate-500">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-indigo-700 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
