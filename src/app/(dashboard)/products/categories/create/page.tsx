import { redirect } from "next/navigation";
import { CategoryForm } from "@/app/(dashboard)/products/_components/category-form";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";

export default async function CreateCategoryPage() {
  const user = await getCurrentUserWithAccess();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.storeId) {
    redirect("/auth/register");
  }

  const canManageCategories = await hasPermission(user.id, "category.manage");

  if (!canManageCategories) {
    redirect("/products/categories");
  }

  return (
    <PageShell
      title="Tambah Kategori"
      description="Buat kategori baru untuk mengelompokkan produk."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Produk", href: "/products" },
        { label: "Kategori", href: "/products/categories" },
        { label: "Tambah" },
      ]}
    >
      <CategoryForm />
    </PageShell>
  );
}
