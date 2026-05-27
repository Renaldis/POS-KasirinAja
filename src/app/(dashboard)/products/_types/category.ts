export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  createdAt: string;
};

export type CategoryActionState = {
  success: boolean;
  message?: string;
};
