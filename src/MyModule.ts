import { Module } from "@nestjs/common";

import { DiscussionboardUsersController } from "./controllers/discussionBoard/users/DiscussionboardUsersController";
import { DiscussionboardUserprofilesController } from "./controllers/discussionBoard/userProfiles/DiscussionboardUserprofilesController";
import { DiscussionboardRoleassignmentsController } from "./controllers/discussionBoard/roleAssignments/DiscussionboardRoleassignmentsController";
import { DiscussionboardAdminsController } from "./controllers/discussionBoard/admins/DiscussionboardAdminsController";
import { DiscussionboardModeratorsController } from "./controllers/discussionBoard/moderators/DiscussionboardModeratorsController";
import { DiscussionboardGuestsController } from "./controllers/discussionBoard/guests/DiscussionboardGuestsController";
import { DiscussionboardForumcategoriesController } from "./controllers/discussionBoard/forumCategories/DiscussionboardForumcategoriesController";
import { DiscussionboardForumsubcategoriesController } from "./controllers/discussionBoard/forumSubcategories/DiscussionboardForumsubcategoriesController";
import { DiscussionboardThreadsController } from "./controllers/discussionBoard/threads/DiscussionboardThreadsController";
import { DiscussionboardPostsController } from "./controllers/discussionBoard/posts/DiscussionboardPostsController";
import { DiscussionboardThreadtagsController } from "./controllers/discussionBoard/threadTags/DiscussionboardThreadtagsController";
import { DiscussionboardForumcategorysnapshotsController } from "./controllers/discussionBoard/forumCategorySnapshots/DiscussionboardForumcategorysnapshotsController";
import { DiscussionboardForumsubcategorysnapshotsController } from "./controllers/discussionBoard/forumSubcategorySnapshots/DiscussionboardForumsubcategorysnapshotsController";
import { DiscussionboardCommentsController } from "./controllers/discussionBoard/comments/DiscussionboardCommentsController";
import { DiscussionboardCommentrepliesController } from "./controllers/discussionBoard/commentReplies/DiscussionboardCommentrepliesController";
import { DiscussionboardPostvotesController } from "./controllers/discussionBoard/postVotes/DiscussionboardPostvotesController";
import { DiscussionboardCommentvotesController } from "./controllers/discussionBoard/commentVotes/DiscussionboardCommentvotesController";
import { DiscussionboardReportsController } from "./controllers/discussionBoard/reports/DiscussionboardReportsController";
import { DiscussionboardModerationactionsController } from "./controllers/discussionBoard/moderationActions/DiscussionboardModerationactionsController";
import { DiscussionboardWarningsController } from "./controllers/discussionBoard/warnings/DiscussionboardWarningsController";
import { DiscussionboardUserbansController } from "./controllers/discussionBoard/userBans/DiscussionboardUserbansController";
import { DiscussionboardNotificationsController } from "./controllers/discussionBoard/notifications/DiscussionboardNotificationsController";
import { DiscussionboardUsersettingsController } from "./controllers/discussionBoard/userSettings/DiscussionboardUsersettingsController";
import { DiscussionboardAttachmentsController } from "./controllers/discussionBoard/attachments/DiscussionboardAttachmentsController";
import { DiscussionboardPostattachmentlinksController } from "./controllers/discussionBoard/postAttachmentLinks/DiscussionboardPostattachmentlinksController";

@Module({
  controllers: [
    DiscussionboardUsersController,
    DiscussionboardUserprofilesController,
    DiscussionboardRoleassignmentsController,
    DiscussionboardAdminsController,
    DiscussionboardModeratorsController,
    DiscussionboardGuestsController,
    DiscussionboardForumcategoriesController,
    DiscussionboardForumsubcategoriesController,
    DiscussionboardThreadsController,
    DiscussionboardPostsController,
    DiscussionboardThreadtagsController,
    DiscussionboardForumcategorysnapshotsController,
    DiscussionboardForumsubcategorysnapshotsController,
    DiscussionboardCommentsController,
    DiscussionboardCommentrepliesController,
    DiscussionboardPostvotesController,
    DiscussionboardCommentvotesController,
    DiscussionboardReportsController,
    DiscussionboardModerationactionsController,
    DiscussionboardWarningsController,
    DiscussionboardUserbansController,
    DiscussionboardNotificationsController,
    DiscussionboardUsersettingsController,
    DiscussionboardAttachmentsController,
    DiscussionboardPostattachmentlinksController,
  ],
})
export class MyModule {}
