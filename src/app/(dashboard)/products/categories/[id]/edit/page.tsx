import { notFound, redirect } from "next/navigation";
import { CategoryEditForm } from "@/app/(dashboard)/products/_components/category-edit-form";
import { PageShell } from "@/components/shared/page-shell";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUserWithAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type EditCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const user = await getCurrentUserWithAccess();
  const { id } = await params;

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

  const category = await prisma.category.findFirst({
    where: {
      id,
      storeId: user.storeId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!category) {
    notFound();
  }

  return (
    <PageShell
      title="Edit Kategori"
      description="Perbarui nama kategori produk."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Produk", href: "/products" },
        { label: "Kategori", href: "/products/categories" },
        { label: category.name },
      ]}
    >
      <CategoryEditForm category={category} />
    </PageShell>
  );
}
