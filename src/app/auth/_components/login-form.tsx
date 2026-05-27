"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const callbackURL = searchParams.get("callbackURL") || "/dashboard";

    setIsPending(true);

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL,
    });

    setIsPending(false);

    if (result.error) {
      toast.error(result.error.message || "Login gagal");
      return;
    }

    router.push(callbackURL);
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="admin@toko.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="********" required />
      </div>
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
