-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'worktime_manager_stop';

-- AlterTable
ALTER TABLE "NotificationSettings" ADD COLUMN     "worktimeManagerStop" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvedOvertimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserNotificationSettings" ADD COLUMN     "worktimeManagerStop" BOOLEAN;
