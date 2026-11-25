"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Campo de senha com o "olho" para mostrar/esconder o que foi digitado. */
export function CampoSenha({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <input
        className="campo pr-10"
        id={id}
        name={name}
        type={visivel ? "text" : "password"}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800"
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        title={visivel ? "Esconder senha" : "Mostrar senha"}
      >
        {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
