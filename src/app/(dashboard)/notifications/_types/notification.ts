export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

export type NotificationActionState = {
  success: boolean;
  message?: string;
};
