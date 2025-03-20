import { Notification, NotificationType } from '@prisma/client';

export interface NotificationCreateInput {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: number;
  relatedEntityType?: string;
  targetId?: number;
  targetType?: string;
}

export interface NotificationUpdateInput {
  title?: string;
  message?: string;
  read?: boolean;
  type?: NotificationType;
  relatedEntityId?: number;
  relatedEntityType?: string;
}

export interface NotificationFilter {
  userId?: number;
  read?: boolean;
  type?: NotificationType;
}

export interface NotificationSettingsUpdateInput {
  taskCreate?: boolean;
  taskUpdate?: boolean;
  taskDelete?: boolean;
  taskStatusChange?: boolean;
  requestCreate?: boolean;
  requestUpdate?: boolean;
  requestDelete?: boolean;
  requestStatusChange?: boolean;
  userCreate?: boolean;
  userUpdate?: boolean;
  userDelete?: boolean;
  roleCreate?: boolean;
  roleUpdate?: boolean;
  roleDelete?: boolean;
  worktimeStart?: boolean;
  worktimeStop?: boolean;
  worktimeAutoStop?: boolean;
}

export interface UserNotificationSettingsUpdateInput {
  taskCreate?: boolean;
  taskUpdate?: boolean;
  taskDelete?: boolean;
  taskStatusChange?: boolean;
  requestCreate?: boolean;
  requestUpdate?: boolean;
  requestDelete?: boolean;
  requestStatusChange?: boolean;
  userCreate?: boolean;
  userUpdate?: boolean;
  userDelete?: boolean;
  roleCreate?: boolean;
  roleUpdate?: boolean;
  roleDelete?: boolean;
  worktimeStart?: boolean;
  worktimeStop?: boolean;
  worktimeAutoStop?: boolean;
  userId: number;
} 