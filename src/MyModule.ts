import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdministratorController } from "./controllers/auth/administrator/AuthAdministratorController";
import { DiscussboardAdministratorSettingsController } from "./controllers/discussBoard/administrator/settings/DiscussboardAdministratorSettingsController";
import { DiscussboardAdministratorForbiddenwordsController } from "./controllers/discussBoard/administrator/forbiddenWords/DiscussboardAdministratorForbiddenwordsController";
import { DiscussboardAdministratorConsentrecordsController } from "./controllers/discussBoard/administrator/consentRecords/DiscussboardAdministratorConsentrecordsController";
import { DiscussboardAdministratorPrivacylogsController } from "./controllers/discussBoard/administrator/privacyLogs/DiscussboardAdministratorPrivacylogsController";
import { DiscussboardAdministratorMembersController } from "./controllers/discussBoard/administrator/members/DiscussboardAdministratorMembersController";
import { DiscussboardMembersProfileController } from "./controllers/discussBoard/members/profile/DiscussboardMembersProfileController";
import { DiscussboardMemberMembersProfileController } from "./controllers/discussBoard/member/members/profile/DiscussboardMemberMembersProfileController";
import { DiscussboardAdministratorMembersProfileController } from "./controllers/discussBoard/administrator/members/profile/DiscussboardAdministratorMembersProfileController";
import { DiscussboardMemberMembersNotificationpreferencesController } from "./controllers/discussBoard/member/members/notificationPreferences/DiscussboardMemberMembersNotificationpreferencesController";
import { DiscussboardAdministratorMembersNotificationpreferencesController } from "./controllers/discussBoard/administrator/members/notificationPreferences/DiscussboardAdministratorMembersNotificationpreferencesController";
import { DiscussboardAdministratorModeratorsController } from "./controllers/discussBoard/administrator/moderators/DiscussboardAdministratorModeratorsController";
import { DiscussboardAdministratorAdministratorsController } from "./controllers/discussBoard/administrator/administrators/DiscussboardAdministratorAdministratorsController";
import { DiscussboardPostsController } from "./controllers/discussBoard/posts/DiscussboardPostsController";
import { DiscussboardMemberPostsController } from "./controllers/discussBoard/member/posts/DiscussboardMemberPostsController";
import { DiscussboardModeratorPostsController } from "./controllers/discussBoard/moderator/posts/DiscussboardModeratorPostsController";
import { DiscussboardAdministratorPostsController } from "./controllers/discussBoard/administrator/posts/DiscussboardAdministratorPostsController";
import { DiscussboardPostsTagsController } from "./controllers/discussBoard/posts/tags/DiscussboardPostsTagsController";
import { DiscussboardMemberPostsTagsController } from "./controllers/discussBoard/member/posts/tags/DiscussboardMemberPostsTagsController";
import { DiscussboardModeratorPostsTagsController } from "./controllers/discussBoard/moderator/posts/tags/DiscussboardModeratorPostsTagsController";
import { DiscussboardAdministratorPostsTagsController } from "./controllers/discussBoard/administrator/posts/tags/DiscussboardAdministratorPostsTagsController";
import { DiscussboardPostsEdithistoriesController } from "./controllers/discussBoard/posts/editHistories/DiscussboardPostsEdithistoriesController";
import { DiscussboardPostsCommentsController } from "./controllers/discussBoard/posts/comments/DiscussboardPostsCommentsController";
import { DiscussboardMemberPostsCommentsController } from "./controllers/discussBoard/member/posts/comments/DiscussboardMemberPostsCommentsController";
import { DiscussboardMemberPostsCommentsEdithistoriesController } from "./controllers/discussBoard/member/posts/comments/editHistories/DiscussboardMemberPostsCommentsEdithistoriesController";
import { DiscussboardModeratorPostsCommentsDeletionlogsController } from "./controllers/discussBoard/moderator/posts/comments/deletionLogs/DiscussboardModeratorPostsCommentsDeletionlogsController";
import { DiscussboardAdministratorPostsCommentsDeletionlogsController } from "./controllers/discussBoard/administrator/posts/comments/deletionLogs/DiscussboardAdministratorPostsCommentsDeletionlogsController";
import { DiscussboardMemberPostsCommentsDeletionlogsController } from "./controllers/discussBoard/member/posts/comments/deletionLogs/DiscussboardMemberPostsCommentsDeletionlogsController";
import { DiscussboardMemberPostreactionsController } from "./controllers/discussBoard/member/postReactions/DiscussboardMemberPostreactionsController";
import { DiscussboardMemberCommentreactionsController } from "./controllers/discussBoard/member/commentReactions/DiscussboardMemberCommentreactionsController";
import { DiscussboardModeratorContentreportsController } from "./controllers/discussBoard/moderator/contentReports/DiscussboardModeratorContentreportsController";
import { DiscussboardAdministratorContentreportsController } from "./controllers/discussBoard/administrator/contentReports/DiscussboardAdministratorContentreportsController";
import { DiscussboardMemberContentreportsController } from "./controllers/discussBoard/member/contentReports/DiscussboardMemberContentreportsController";
import { DiscussboardModeratorModerationactionsController } from "./controllers/discussBoard/moderator/moderationActions/DiscussboardModeratorModerationactionsController";
import { DiscussboardAdministratorModerationactionsController } from "./controllers/discussBoard/administrator/moderationActions/DiscussboardAdministratorModerationactionsController";
import { DiscussboardModeratorAppealsController } from "./controllers/discussBoard/moderator/appeals/DiscussboardModeratorAppealsController";
import { DiscussboardAdministratorAppealsController } from "./controllers/discussBoard/administrator/appeals/DiscussboardAdministratorAppealsController";
import { DiscussboardMemberAppealsController } from "./controllers/discussBoard/member/appeals/DiscussboardMemberAppealsController";
import { DiscussboardAdministratorModerationactionsModerationlogsController } from "./controllers/discussBoard/administrator/moderationActions/moderationLogs/DiscussboardAdministratorModerationactionsModerationlogsController";
import { DiscussboardModeratorModerationactionsModerationlogsController } from "./controllers/discussBoard/moderator/moderationActions/moderationLogs/DiscussboardModeratorModerationactionsModerationlogsController";
import { DiscussboardAdministratorNotificationsController } from "./controllers/discussBoard/administrator/notifications/DiscussboardAdministratorNotificationsController";
import { DiscussboardMemberNotificationsController } from "./controllers/discussBoard/member/notifications/DiscussboardMemberNotificationsController";
import { DiscussboardModeratorNotificationsController } from "./controllers/discussBoard/moderator/notifications/DiscussboardModeratorNotificationsController";
import { DiscussboardAdministratorIntegrationlogsController } from "./controllers/discussBoard/administrator/integrationLogs/DiscussboardAdministratorIntegrationlogsController";
import { DiscussboardAdministratorAuditlogsController } from "./controllers/discussBoard/administrator/auditLogs/DiscussboardAdministratorAuditlogsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    AuthAdministratorController,
    DiscussboardAdministratorSettingsController,
    DiscussboardAdministratorForbiddenwordsController,
    DiscussboardAdministratorConsentrecordsController,
    DiscussboardAdministratorPrivacylogsController,
    DiscussboardAdministratorMembersController,
    DiscussboardMembersProfileController,
    DiscussboardMemberMembersProfileController,
    DiscussboardAdministratorMembersProfileController,
    DiscussboardMemberMembersNotificationpreferencesController,
    DiscussboardAdministratorMembersNotificationpreferencesController,
    DiscussboardAdministratorModeratorsController,
    DiscussboardAdministratorAdministratorsController,
    DiscussboardPostsController,
    DiscussboardMemberPostsController,
    DiscussboardModeratorPostsController,
    DiscussboardAdministratorPostsController,
    DiscussboardPostsTagsController,
    DiscussboardMemberPostsTagsController,
    DiscussboardModeratorPostsTagsController,
    DiscussboardAdministratorPostsTagsController,
    DiscussboardPostsEdithistoriesController,
    DiscussboardPostsCommentsController,
    DiscussboardMemberPostsCommentsController,
    DiscussboardMemberPostsCommentsEdithistoriesController,
    DiscussboardModeratorPostsCommentsDeletionlogsController,
    DiscussboardAdministratorPostsCommentsDeletionlogsController,
    DiscussboardMemberPostsCommentsDeletionlogsController,
    DiscussboardMemberPostreactionsController,
    DiscussboardMemberCommentreactionsController,
    DiscussboardModeratorContentreportsController,
    DiscussboardAdministratorContentreportsController,
    DiscussboardMemberContentreportsController,
    DiscussboardModeratorModerationactionsController,
    DiscussboardAdministratorModerationactionsController,
    DiscussboardModeratorAppealsController,
    DiscussboardAdministratorAppealsController,
    DiscussboardMemberAppealsController,
    DiscussboardAdministratorModerationactionsModerationlogsController,
    DiscussboardModeratorModerationactionsModerationlogsController,
    DiscussboardAdministratorNotificationsController,
    DiscussboardMemberNotificationsController,
    DiscussboardModeratorNotificationsController,
    DiscussboardAdministratorIntegrationlogsController,
    DiscussboardAdministratorAuditlogsController,
  ],
})
export class MyModule {}
