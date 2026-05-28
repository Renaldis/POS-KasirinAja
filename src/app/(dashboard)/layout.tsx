import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getUserPermissionKeys } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const permissionKeys = await getUserPermissionKeys(user.id);

  return (
    <DashboardShell permissionKeys={[...permissionKeys]}>{children}</DashboardShell>
  );
}
