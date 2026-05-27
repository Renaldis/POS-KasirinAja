"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { setupInitialStoreAction } from "@/app/auth/_actions/setup-initial-store-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function RegisterForm() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isPending, setIsPending] = useState(false);
  const isSetupOnly = Boolean(session?.user);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const storeName = String(formData.get("storeName") ?? "");
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsPending(true);

    if (!isSetupOnly) {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setIsPending(false);
        toast.error(result.error.message || "Registrasi gagal");
        return;
      }
    }

    const setupStoreResult = await setupInitialStoreAction({ storeName });

    setIsPending(false);

    if (!setupStoreResult.success) {
      toast.error(setupStoreResult.message || "Toko gagal dibuat");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="store-name">Nama Toko</Label>
        <Input id="store-name" name="storeName" placeholder="Warung Maju" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nama Admin</Label>
        <Input
          id="name"
          name="name"
          placeholder="Nama lengkap"
          required={!isSetupOnly}
          disabled={isSetupOnly}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@toko.com"
          required={!isSetupOnly}
          disabled={isSetupOnly}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="********"
          required={!isSetupOnly}
          disabled={isSetupOnly}
        />
      </div>
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Memproses..." : "Buat Toko"}
      </Button>
    </form>
  );
}
