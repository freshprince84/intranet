-- AlterTable
ALTER TABLE "NotificationSettings" ADD COLUMN     "joinRequestApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "joinRequestReceived" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "joinRequestRejected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "organizationInvitationReceived" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserNotificationSettings" ADD COLUMN     "joinRequestApproved" BOOLEAN,
ADD COLUMN     "joinRequestReceived" BOOLEAN,
ADD COLUMN     "joinRequestRejected" BOOLEAN,
ADD COLUMN     "organizationInvitationReceived" BOOLEAN;
