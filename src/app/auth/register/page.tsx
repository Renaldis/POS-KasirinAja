import { RegisterForm } from "@/app/auth/_components/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border bg-[var(--card)] p-6">
        <div>
          <h1 className="text-xl font-semibold">Daftar Toko</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Buat toko pertama dan akun admin.
          </p>
        </div>

        <RegisterForm />
      </div>
    </main>
  );
}
