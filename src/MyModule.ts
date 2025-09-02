import { Module } from "@nestjs/common";

import { AuthVisitorController } from "./controllers/auth/visitor/AuthVisitorController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardAdminCategoriesController } from "./controllers/discussionBoard/admin/categories/DiscussionboardAdminCategoriesController";
import { DiscussionboardAdminTagsController } from "./controllers/discussionBoard/admin/tags/DiscussionboardAdminTagsController";
import { DiscussionboardAdminSettingsController } from "./controllers/discussionBoard/admin/settings/DiscussionboardAdminSettingsController";
import { DiscussionboardAdminAuditlogsController } from "./controllers/discussionBoard/admin/auditLogs/DiscussionboardAdminAuditlogsController";
import { DiscussionboardUserUsersController } from "./controllers/discussionBoard/user/users/DiscussionboardUserUsersController";
import { DiscussionboardAdminUsersController } from "./controllers/discussionBoard/admin/users/DiscussionboardAdminUsersController";
import { DiscussionboardAdminActionlogsController } from "./controllers/discussionBoard/admin/actionLogs/DiscussionboardAdminActionlogsController";
import { DiscussionboardModeratorUsersController } from "./controllers/discussionBoard/moderator/users/DiscussionboardModeratorUsersController";
import { DiscussionboardAdminUsersModeratorController } from "./controllers/discussionBoard/admin/users/moderator/DiscussionboardAdminUsersModeratorController";
import { DiscussionboardModeratorUsersModeratorController } from "./controllers/discussionBoard/moderator/users/moderator/DiscussionboardModeratorUsersModeratorController";
import { DiscussionboardAdminUsersAdminController } from "./controllers/discussionBoard/admin/users/admin/DiscussionboardAdminUsersAdminController";
import { DiscussionboardAdminVisitorsController } from "./controllers/discussionBoard/admin/visitors/DiscussionboardAdminVisitorsController";
import { DiscussionboardThreadsController } from "./controllers/discussionBoard/threads/DiscussionboardThreadsController";
import { DiscussionboardUserThreadsController } from "./controllers/discussionBoard/user/threads/DiscussionboardUserThreadsController";
import { DiscussionboardThreadsPostsController } from "./controllers/discussionBoard/threads/posts/DiscussionboardThreadsPostsController";
import { DiscussionboardUserThreadsPostsController } from "./controllers/discussionBoard/user/threads/posts/DiscussionboardUserThreadsPostsController";
import { DiscussionboardModeratorThreadsPostsController } from "./controllers/discussionBoard/moderator/threads/posts/DiscussionboardModeratorThreadsPostsController";
import { DiscussionboardAdminThreadsPostsController } from "./controllers/discussionBoard/admin/threads/posts/DiscussionboardAdminThreadsPostsController";
import { DiscussionboardThreadsPostsCommentsController } from "./controllers/discussionBoard/threads/posts/comments/DiscussionboardThreadsPostsCommentsController";
import { DiscussionboardUserThreadsPostsCommentsController } from "./controllers/discussionBoard/user/threads/posts/comments/DiscussionboardUserThreadsPostsCommentsController";
import { DiscussionboardModeratorThreadsPostsCommentsController } from "./controllers/discussionBoard/moderator/threads/posts/comments/DiscussionboardModeratorThreadsPostsCommentsController";
import { DiscussionboardAdminThreadsPostsCommentsController } from "./controllers/discussionBoard/admin/threads/posts/comments/DiscussionboardAdminThreadsPostsCommentsController";
import { DiscussionboardThreadsPostsAttachmentsController } from "./controllers/discussionBoard/threads/posts/attachments/DiscussionboardThreadsPostsAttachmentsController";
import { DiscussionboardUserThreadsPostsAttachmentsController } from "./controllers/discussionBoard/user/threads/posts/attachments/DiscussionboardUserThreadsPostsAttachmentsController";
import { DiscussionboardUserThreadsPostsCommentsAttachmentsController } from "./controllers/discussionBoard/user/threads/posts/comments/attachments/DiscussionboardUserThreadsPostsCommentsAttachmentsController";
import { DiscussionboardUserThreadsPostsCommentsRepliesController } from "./controllers/discussionBoard/user/threads/posts/comments/replies/DiscussionboardUserThreadsPostsCommentsRepliesController";
import { DiscussionboardUserVotesController } from "./controllers/discussionBoard/user/votes/DiscussionboardUserVotesController";
import { DiscussionboardModeratorPostsPollsController } from "./controllers/discussionBoard/moderator/posts/polls/DiscussionboardModeratorPostsPollsController";
import { DiscussionboardAdminPostsPollsController } from "./controllers/discussionBoard/admin/posts/polls/DiscussionboardAdminPostsPollsController";
import { DiscussionboardUserPostsPollsController } from "./controllers/discussionBoard/user/posts/polls/DiscussionboardUserPostsPollsController";
import { DiscussionboardModeratorPostsPollsPolloptionsController } from "./controllers/discussionBoard/moderator/posts/polls/pollOptions/DiscussionboardModeratorPostsPollsPolloptionsController";
import { DiscussionboardAdminPostsPollsPolloptionsController } from "./controllers/discussionBoard/admin/posts/polls/pollOptions/DiscussionboardAdminPostsPollsPolloptionsController";
import { DiscussionboardUserPostsPollsPolloptionsController } from "./controllers/discussionBoard/user/posts/polls/pollOptions/DiscussionboardUserPostsPollsPolloptionsController";
import { DiscussionboardUserPollsPollvotesController } from "./controllers/discussionBoard/user/polls/pollVotes/DiscussionboardUserPollsPollvotesController";
import { DiscussionboardModeratorFlagreportsController } from "./controllers/discussionBoard/moderator/flagReports/DiscussionboardModeratorFlagreportsController";
import { DiscussionboardUserFlagreportsController } from "./controllers/discussionBoard/user/flagReports/DiscussionboardUserFlagreportsController";
import { DiscussionboardModeratorModerationactionsController } from "./controllers/discussionBoard/moderator/moderationActions/DiscussionboardModeratorModerationactionsController";
import { DiscussionboardAdminFlagreportsController } from "./controllers/discussionBoard/admin/flagReports/DiscussionboardAdminFlagreportsController";
import { DiscussionboardAdminModerationactionsController } from "./controllers/discussionBoard/admin/moderationActions/DiscussionboardAdminModerationactionsController";
import { DiscussionboardUserAppealsController } from "./controllers/discussionBoard/user/appeals/DiscussionboardUserAppealsController";
import { DiscussionboardModeratorAppealsController } from "./controllers/discussionBoard/moderator/appeals/DiscussionboardModeratorAppealsController";
import { DiscussionboardAdminAppealsController } from "./controllers/discussionBoard/admin/appeals/DiscussionboardAdminAppealsController";
import { DiscussionboardUserNotificationsController } from "./controllers/discussionBoard/user/notifications/DiscussionboardUserNotificationsController";
import { DiscussionboardUserNotificationpreferencesController } from "./controllers/discussionBoard/user/notificationPreferences/DiscussionboardUserNotificationpreferencesController";
import { DiscussionboardUserNotificationsubscriptionsController } from "./controllers/discussionBoard/user/notificationSubscriptions/DiscussionboardUserNotificationsubscriptionsController";
import { DiscussionboardUserJwttokensController } from "./controllers/discussionBoard/user/jwtTokens/DiscussionboardUserJwttokensController";
import { DiscussionboardAdminRefreshtokensController } from "./controllers/discussionBoard/admin/refreshTokens/DiscussionboardAdminRefreshtokensController";
import { DiscussionboardAdminPasswordresetsController } from "./controllers/discussionBoard/admin/passwordResets/DiscussionboardAdminPasswordresetsController";
import { DiscussionboardAdminVerificationtokensController } from "./controllers/discussionBoard/admin/verificationTokens/DiscussionboardAdminVerificationtokensController";
import { DiscussionboardAdminDataerasurerequestsController } from "./controllers/discussionBoard/admin/dataErasureRequests/DiscussionboardAdminDataerasurerequestsController";
import { DiscussionboardAdminPrivacydashboardsController } from "./controllers/discussionBoard/admin/privacyDashboards/DiscussionboardAdminPrivacydashboardsController";
import { DiscussionboardAdminComplianceeventsController } from "./controllers/discussionBoard/admin/complianceEvents/DiscussionboardAdminComplianceeventsController";
import { DiscussionboardAdminExportlogsController } from "./controllers/discussionBoard/admin/exportLogs/DiscussionboardAdminExportlogsController";

@Module({
  controllers: [
    AuthVisitorController,
    AuthUserController,
    AuthModeratorController,
    AuthAdminController,
    DiscussionboardAdminCategoriesController,
    DiscussionboardAdminTagsController,
    DiscussionboardAdminSettingsController,
    DiscussionboardAdminAuditlogsController,
    DiscussionboardUserUsersController,
    DiscussionboardAdminUsersController,
    DiscussionboardAdminActionlogsController,
    DiscussionboardModeratorUsersController,
    DiscussionboardAdminUsersModeratorController,
    DiscussionboardModeratorUsersModeratorController,
    DiscussionboardAdminUsersAdminController,
    DiscussionboardAdminVisitorsController,
    DiscussionboardThreadsController,
    DiscussionboardUserThreadsController,
    DiscussionboardThreadsPostsController,
    DiscussionboardUserThreadsPostsController,
    DiscussionboardModeratorThreadsPostsController,
    DiscussionboardAdminThreadsPostsController,
    DiscussionboardThreadsPostsCommentsController,
    DiscussionboardUserThreadsPostsCommentsController,
    DiscussionboardModeratorThreadsPostsCommentsController,
    DiscussionboardAdminThreadsPostsCommentsController,
    DiscussionboardThreadsPostsAttachmentsController,
    DiscussionboardUserThreadsPostsAttachmentsController,
    DiscussionboardUserThreadsPostsCommentsAttachmentsController,
    DiscussionboardUserThreadsPostsCommentsRepliesController,
    DiscussionboardUserVotesController,
    DiscussionboardModeratorPostsPollsController,
    DiscussionboardAdminPostsPollsController,
    DiscussionboardUserPostsPollsController,
    DiscussionboardModeratorPostsPollsPolloptionsController,
    DiscussionboardAdminPostsPollsPolloptionsController,
    DiscussionboardUserPostsPollsPolloptionsController,
    DiscussionboardUserPollsPollvotesController,
    DiscussionboardModeratorFlagreportsController,
    DiscussionboardUserFlagreportsController,
    DiscussionboardModeratorModerationactionsController,
    DiscussionboardAdminFlagreportsController,
    DiscussionboardAdminModerationactionsController,
    DiscussionboardUserAppealsController,
    DiscussionboardModeratorAppealsController,
    DiscussionboardAdminAppealsController,
    DiscussionboardUserNotificationsController,
    DiscussionboardUserNotificationpreferencesController,
    DiscussionboardUserNotificationsubscriptionsController,
    DiscussionboardUserJwttokensController,
    DiscussionboardAdminRefreshtokensController,
    DiscussionboardAdminPasswordresetsController,
    DiscussionboardAdminVerificationtokensController,
    DiscussionboardAdminDataerasurerequestsController,
    DiscussionboardAdminPrivacydashboardsController,
    DiscussionboardAdminComplianceeventsController,
    DiscussionboardAdminExportlogsController,
  ],
})
export class MyModule {}
