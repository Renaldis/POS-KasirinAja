export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

export type NotificationActionState = {
  success: boolean;
  message?: string;
};
