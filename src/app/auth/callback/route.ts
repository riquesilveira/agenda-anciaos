import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

/**
 * Volta do login com Google. Quem já tem perfil entra; quem não tem só segue
 * se veio do link de entrada da igreja (lá completa nome e departamento).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const pedido = url.searchParams.get("proximo") ?? "/";
  // Só caminhos internos (evita redirecionar para fora do site).
  const proximo = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";
  const para = (caminho: string) => NextResponse.redirect(new URL(caminho, url.origin));

  if (!code) return para("/login?erro=google");
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return para("/login?erro=google");

  const { data: perfil } = await supabase.from("perfis").select("id").eq("id", data.user.id).maybeSingle();
  if (perfil) return para(proximo.startsWith("/entrar") ? "/" : proximo);
  if (proximo.startsWith("/entrar")) return para(proximo);

  await supabase.auth.signOut();
  return para("/login?erro=sem-acesso");
}
