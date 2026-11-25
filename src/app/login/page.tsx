import { Suspense } from "react";
import { googleAtivo } from "@/lib/google";
import { FormLogin } from "./form-login";

export default async function PaginaLogin() {
  const google = await googleAtivo();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <FormLogin google={google} />
      </Suspense>
    </main>
  );
}
