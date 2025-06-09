import { Module } from "@nestjs/common";

import { CoreUsersController } from "./controllers/core/users/CoreUsersController";
import { CoreUserprofilesController } from "./controllers/core/userProfiles/CoreUserprofilesController";
import { CoreRolesController } from "./controllers/core/roles/CoreRolesController";
import { CoreRoleassignmentsController } from "./controllers/core/roleAssignments/CoreRoleassignmentsController";
import { CoreOrganizationsController } from "./controllers/core/organizations/CoreOrganizationsController";
import { ThreadspostsThreadsController } from "./controllers/threadsPosts/threads/ThreadspostsThreadsController";
import { ThreadspostsPostsController } from "./controllers/threadsPosts/posts/ThreadspostsPostsController";
import { ThreadspostsPosteditsController } from "./controllers/threadsPosts/postEdits/ThreadspostsPosteditsController";
import { ThreadspostsPostvotesController } from "./controllers/threadsPosts/postVotes/ThreadspostsPostvotesController";
import { ThreadspostsPollsController } from "./controllers/threadsPosts/polls/ThreadspostsPollsController";
import { ThreadspostsPolloptionsController } from "./controllers/threadsPosts/pollOptions/ThreadspostsPolloptionsController";
import { ThreadspostsPollvotesController } from "./controllers/threadsPosts/pollVotes/ThreadspostsPollvotesController";
import { CommentsCommentsController } from "./controllers/comments/comments/CommentsCommentsController";
import { CommentsCommenteditsController } from "./controllers/comments/commentEdits/CommentsCommenteditsController";
import { CommentsCommentvotesController } from "./controllers/comments/commentVotes/CommentsCommentvotesController";
import { ModerationModerationlogsController } from "./controllers/moderation/moderationLogs/ModerationModerationlogsController";
import { ModerationPostreportsController } from "./controllers/moderation/postReports/ModerationPostreportsController";
import { ModerationCommentreportsController } from "./controllers/moderation/commentReports/ModerationCommentreportsController";
import { ModerationUserwarningsController } from "./controllers/moderation/userWarnings/ModerationUserwarningsController";
import { ModerationSuspensionsController } from "./controllers/moderation/suspensions/ModerationSuspensionsController";
import { ModerationBansController } from "./controllers/moderation/bans/ModerationBansController";
import { NotificationsNotificationsController } from "./controllers/notifications/notifications/NotificationsNotificationsController";
import { NotificationsNotificationpreferencesController } from "./controllers/notifications/notificationPreferences/NotificationsNotificationpreferencesController";
import { CategoriestagsCategoriesController } from "./controllers/categoriesTags/categories/CategoriestagsCategoriesController";
import { CategoriestagsTagsController } from "./controllers/categoriesTags/tags/CategoriestagsTagsController";
import { CategoriestagsThreadtagsController } from "./controllers/categoriesTags/threadTags/CategoriestagsThreadtagsController";
import { SettingsSitesettingsController } from "./controllers/settings/siteSettings/SettingsSitesettingsController";
import { SettingsUsersettingsController } from "./controllers/settings/userSettings/SettingsUsersettingsController";

@Module({
  controllers: [
    CoreUsersController,
    CoreUserprofilesController,
    CoreRolesController,
    CoreRoleassignmentsController,
    CoreOrganizationsController,
    ThreadspostsThreadsController,
    ThreadspostsPostsController,
    ThreadspostsPosteditsController,
    ThreadspostsPostvotesController,
    ThreadspostsPollsController,
    ThreadspostsPolloptionsController,
    ThreadspostsPollvotesController,
    CommentsCommentsController,
    CommentsCommenteditsController,
    CommentsCommentvotesController,
    ModerationModerationlogsController,
    ModerationPostreportsController,
    ModerationCommentreportsController,
    ModerationUserwarningsController,
    ModerationSuspensionsController,
    ModerationBansController,
    NotificationsNotificationsController,
    NotificationsNotificationpreferencesController,
    CategoriestagsCategoriesController,
    CategoriestagsTagsController,
    CategoriestagsThreadtagsController,
    SettingsSitesettingsController,
    SettingsUsersettingsController,
  ],
})
export class MyModule {}
