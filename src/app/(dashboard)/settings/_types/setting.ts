export type StoreSettings = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
};

export type NotificationPreferenceFormItem = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  permissionOptions: Array<{
    key: string;
    label: string;
    checked: boolean;
  }>;
};

export type SettingActionState = {
  success: boolean;
  message?: string;
};
