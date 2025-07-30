import { Module } from "@nestjs/common";

import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardAdminCategoriesController } from "./controllers/discussionBoard/admin/categories/DiscussionboardAdminCategoriesController";
import { DiscussionboardAdminCategoriesCategorymoderatorsController } from "./controllers/discussionBoard/admin/categories/categoryModerators/DiscussionboardAdminCategoriesCategorymoderatorsController";
import { DiscussionboardAdminSettingsController } from "./controllers/discussionBoard/admin/settings/DiscussionboardAdminSettingsController";
import { DiscussionboardAdminAuditlogsController } from "./controllers/discussionBoard/admin/auditLogs/DiscussionboardAdminAuditlogsController";
import { DiscussionboardAdminSystemnoticesController } from "./controllers/discussionBoard/admin/systemNotices/DiscussionboardAdminSystemnoticesController";
import { DiscussionboardModeratorSystemnoticesController } from "./controllers/discussionBoard/moderator/systemNotices/DiscussionboardModeratorSystemnoticesController";
import { DiscussionboardMemberSystemnoticesController } from "./controllers/discussionBoard/member/systemNotices/DiscussionboardMemberSystemnoticesController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminModeratorsController } from "./controllers/discussionBoard/admin/moderators/DiscussionboardAdminModeratorsController";
import { DiscussionboardAdminMembersController } from "./controllers/discussionBoard/admin/members/DiscussionboardAdminMembersController";
import { DiscussionboardAdminGuestsController } from "./controllers/discussionBoard/admin/guests/DiscussionboardAdminGuestsController";
import { DiscussionboardGuestsController } from "./controllers/discussionBoard/guests/DiscussionboardGuestsController";
import { DiscussionboardAdminUsersessionsController } from "./controllers/discussionBoard/admin/userSessions/DiscussionboardAdminUsersessionsController";
import { DiscussionboardUsersessionsController } from "./controllers/discussionBoard/userSessions/DiscussionboardUsersessionsController";
import { DiscussionboardTopicsController } from "./controllers/discussionBoard/topics/DiscussionboardTopicsController";
import { DiscussionboardMemberTopicsController } from "./controllers/discussionBoard/member/topics/DiscussionboardMemberTopicsController";
import { DiscussionboardModeratorTopicsController } from "./controllers/discussionBoard/moderator/topics/DiscussionboardModeratorTopicsController";
import { DiscussionboardAdminTopicsController } from "./controllers/discussionBoard/admin/topics/DiscussionboardAdminTopicsController";
import { DiscussionboardTopicsThreadsController } from "./controllers/discussionBoard/topics/threads/DiscussionboardTopicsThreadsController";
import { DiscussionboardMemberTopicsThreadsController } from "./controllers/discussionBoard/member/topics/threads/DiscussionboardMemberTopicsThreadsController";
import { DiscussionboardModeratorTopicsThreadsController } from "./controllers/discussionBoard/moderator/topics/threads/DiscussionboardModeratorTopicsThreadsController";
import { DiscussionboardAdminTopicsThreadsController } from "./controllers/discussionBoard/admin/topics/threads/DiscussionboardAdminTopicsThreadsController";
import { DiscussionboardMemberThreadsPostsController } from "./controllers/discussionBoard/member/threads/posts/DiscussionboardMemberThreadsPostsController";
import { DiscussionboardMemberPostsVersionsController } from "./controllers/discussionBoard/member/posts/versions/DiscussionboardMemberPostsVersionsController";
import { DiscussionboardAdminPostsVersionsController } from "./controllers/discussionBoard/admin/posts/versions/DiscussionboardAdminPostsVersionsController";
import { DiscussionboardModeratorPostsVersionsController } from "./controllers/discussionBoard/moderator/posts/versions/DiscussionboardModeratorPostsVersionsController";
import { DiscussionboardPostsAttachmentsController } from "./controllers/discussionBoard/posts/attachments/DiscussionboardPostsAttachmentsController";
import { DiscussionboardMemberPostsAttachmentsController } from "./controllers/discussionBoard/member/posts/attachments/DiscussionboardMemberPostsAttachmentsController";
import { DiscussionboardModeratorPostsAttachmentsController } from "./controllers/discussionBoard/moderator/posts/attachments/DiscussionboardModeratorPostsAttachmentsController";
import { DiscussionboardAdminPostsAttachmentsController } from "./controllers/discussionBoard/admin/posts/attachments/DiscussionboardAdminPostsAttachmentsController";
import { DiscussionboardAdminCommentsController } from "./controllers/discussionBoard/admin/comments/DiscussionboardAdminCommentsController";
import { DiscussionboardModeratorCommentsController } from "./controllers/discussionBoard/moderator/comments/DiscussionboardModeratorCommentsController";
import { DiscussionboardMemberCommentsController } from "./controllers/discussionBoard/member/comments/DiscussionboardMemberCommentsController";
import { DiscussionboardMemberCommentsVersionsController } from "./controllers/discussionBoard/member/comments/versions/DiscussionboardMemberCommentsVersionsController";
import { DiscussionboardModeratorCommentsVersionsController } from "./controllers/discussionBoard/moderator/comments/versions/DiscussionboardModeratorCommentsVersionsController";
import { DiscussionboardAdminCommentsVersionsController } from "./controllers/discussionBoard/admin/comments/versions/DiscussionboardAdminCommentsVersionsController";
import { DiscussionboardMemberCommentsAttachmentsController } from "./controllers/discussionBoard/member/comments/attachments/DiscussionboardMemberCommentsAttachmentsController";
import { DiscussionboardModeratorCommentsAttachmentsController } from "./controllers/discussionBoard/moderator/comments/attachments/DiscussionboardModeratorCommentsAttachmentsController";
import { DiscussionboardAdminCommentsAttachmentsController } from "./controllers/discussionBoard/admin/comments/attachments/DiscussionboardAdminCommentsAttachmentsController";
import { DiscussionboardModeratorReportsController } from "./controllers/discussionBoard/moderator/reports/DiscussionboardModeratorReportsController";
import { DiscussionboardAdminReportsController } from "./controllers/discussionBoard/admin/reports/DiscussionboardAdminReportsController";
import { DiscussionboardMemberReportsController } from "./controllers/discussionBoard/member/reports/DiscussionboardMemberReportsController";
import { DiscussionboardModeratorModerationactionsController } from "./controllers/discussionBoard/moderator/moderationActions/DiscussionboardModeratorModerationactionsController";
import { DiscussionboardAdminModerationactionsController } from "./controllers/discussionBoard/admin/moderationActions/DiscussionboardAdminModerationactionsController";
import { DiscussionboardModeratorContentflagsController } from "./controllers/discussionBoard/moderator/contentFlags/DiscussionboardModeratorContentflagsController";
import { DiscussionboardAdminContentflagsController } from "./controllers/discussionBoard/admin/contentFlags/DiscussionboardAdminContentflagsController";
import { DiscussionboardAdminSubscriptionsController } from "./controllers/discussionBoard/admin/subscriptions/DiscussionboardAdminSubscriptionsController";
import { DiscussionboardMemberSubscriptionsController } from "./controllers/discussionBoard/member/subscriptions/DiscussionboardMemberSubscriptionsController";
import { DiscussionboardMemberNotificationsController } from "./controllers/discussionBoard/member/notifications/DiscussionboardMemberNotificationsController";
import { DiscussionboardAdminNotificationsController } from "./controllers/discussionBoard/admin/notifications/DiscussionboardAdminNotificationsController";
import { DiscussionboardModeratorNotificationsController } from "./controllers/discussionBoard/moderator/notifications/DiscussionboardModeratorNotificationsController";
import { DiscussionboardAdminActivitylogsController } from "./controllers/discussionBoard/admin/activityLogs/DiscussionboardAdminActivitylogsController";
import { DiscussionboardModeratorActivitylogsController } from "./controllers/discussionBoard/moderator/activityLogs/DiscussionboardModeratorActivitylogsController";
import { DiscussionboardAdminEngagementstatsController } from "./controllers/discussionBoard/admin/engagementStats/DiscussionboardAdminEngagementstatsController";

@Module({
  controllers: [
    DiscussionboardCategoriesController,
    DiscussionboardAdminCategoriesController,
    DiscussionboardAdminCategoriesCategorymoderatorsController,
    DiscussionboardAdminSettingsController,
    DiscussionboardAdminAuditlogsController,
    DiscussionboardAdminSystemnoticesController,
    DiscussionboardModeratorSystemnoticesController,
    DiscussionboardMemberSystemnoticesController,
    DiscussionboardAdminAdminsController,
    DiscussionboardAdminModeratorsController,
    DiscussionboardAdminMembersController,
    DiscussionboardAdminGuestsController,
    DiscussionboardGuestsController,
    DiscussionboardAdminUsersessionsController,
    DiscussionboardUsersessionsController,
    DiscussionboardTopicsController,
    DiscussionboardMemberTopicsController,
    DiscussionboardModeratorTopicsController,
    DiscussionboardAdminTopicsController,
    DiscussionboardTopicsThreadsController,
    DiscussionboardMemberTopicsThreadsController,
    DiscussionboardModeratorTopicsThreadsController,
    DiscussionboardAdminTopicsThreadsController,
    DiscussionboardMemberThreadsPostsController,
    DiscussionboardMemberPostsVersionsController,
    DiscussionboardAdminPostsVersionsController,
    DiscussionboardModeratorPostsVersionsController,
    DiscussionboardPostsAttachmentsController,
    DiscussionboardMemberPostsAttachmentsController,
    DiscussionboardModeratorPostsAttachmentsController,
    DiscussionboardAdminPostsAttachmentsController,
    DiscussionboardAdminCommentsController,
    DiscussionboardModeratorCommentsController,
    DiscussionboardMemberCommentsController,
    DiscussionboardMemberCommentsVersionsController,
    DiscussionboardModeratorCommentsVersionsController,
    DiscussionboardAdminCommentsVersionsController,
    DiscussionboardMemberCommentsAttachmentsController,
    DiscussionboardModeratorCommentsAttachmentsController,
    DiscussionboardAdminCommentsAttachmentsController,
    DiscussionboardModeratorReportsController,
    DiscussionboardAdminReportsController,
    DiscussionboardMemberReportsController,
    DiscussionboardModeratorModerationactionsController,
    DiscussionboardAdminModerationactionsController,
    DiscussionboardModeratorContentflagsController,
    DiscussionboardAdminContentflagsController,
    DiscussionboardAdminSubscriptionsController,
    DiscussionboardMemberSubscriptionsController,
    DiscussionboardMemberNotificationsController,
    DiscussionboardAdminNotificationsController,
    DiscussionboardModeratorNotificationsController,
    DiscussionboardAdminActivitylogsController,
    DiscussionboardModeratorActivitylogsController,
    DiscussionboardAdminEngagementstatsController,
  ],
})
export class MyModule {}
