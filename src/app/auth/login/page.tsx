import { Suspense } from "react";
import { LoginForm } from "@/app/auth/_components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border bg-[var(--card)] p-6">
        <div>
          <h1 className="text-xl font-semibold">Masuk KasirinAja</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Gunakan akun toko untuk membuka dashboard.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
