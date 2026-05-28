export type StoreSettings = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
};

export type SettingActionState = {
  success: boolean;
  message?: string;
};
