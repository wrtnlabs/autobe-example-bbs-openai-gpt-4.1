import { Module } from "@nestjs/common";

import { DiscussionboardConfigurationsController } from "./controllers/discussionBoard/configurations/DiscussionboardConfigurationsController";
import { DiscussionboardChannelsController } from "./controllers/discussionBoard/channels/DiscussionboardChannelsController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardGuestsController } from "./controllers/discussionBoard/guests/DiscussionboardGuestsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardModeratorsController } from "./controllers/discussionBoard/moderators/DiscussionboardModeratorsController";
import { DiscussionboardAdministratorsController } from "./controllers/discussionBoard/administrators/DiscussionboardAdministratorsController";
import { DiscussionboardThreadsController } from "./controllers/discussionBoard/threads/DiscussionboardThreadsController";
import { DiscussionboardPostsController } from "./controllers/discussionBoard/posts/DiscussionboardPostsController";
import { DiscussionboardCommentsController } from "./controllers/discussionBoard/comments/DiscussionboardCommentsController";
import { DiscussionboardAttachmentsController } from "./controllers/discussionBoard/attachments/DiscussionboardAttachmentsController";
import { DiscussionboardReportsController } from "./controllers/discussionBoard/reports/DiscussionboardReportsController";
import { DiscussionboardModerationlogsController } from "./controllers/discussionBoard/moderationLogs/DiscussionboardModerationlogsController";
import { DiscussionboardWarningsController } from "./controllers/discussionBoard/warnings/DiscussionboardWarningsController";
import { DiscussionboardBansController } from "./controllers/discussionBoard/bans/DiscussionboardBansController";
import { DiscussionboardNotificationsController } from "./controllers/discussionBoard/notifications/DiscussionboardNotificationsController";
import { DiscussionboardSubscriptionsController } from "./controllers/discussionBoard/subscriptions/DiscussionboardSubscriptionsController";
import { DiscussionboardMentionsController } from "./controllers/discussionBoard/mentions/DiscussionboardMentionsController";
import { DiscussionboardVotetypesController } from "./controllers/discussionBoard/voteTypes/DiscussionboardVotetypesController";
import { DiscussionboardVotesController } from "./controllers/discussionBoard/votes/DiscussionboardVotesController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardSearchhistoriesController } from "./controllers/discussionBoard/searchHistories/DiscussionboardSearchhistoriesController";

@Module({
  controllers: [
    DiscussionboardConfigurationsController,
    DiscussionboardChannelsController,
    DiscussionboardSectionsController,
    DiscussionboardGuestsController,
    DiscussionboardMembersController,
    DiscussionboardModeratorsController,
    DiscussionboardAdministratorsController,
    DiscussionboardThreadsController,
    DiscussionboardPostsController,
    DiscussionboardCommentsController,
    DiscussionboardAttachmentsController,
    DiscussionboardReportsController,
    DiscussionboardModerationlogsController,
    DiscussionboardWarningsController,
    DiscussionboardBansController,
    DiscussionboardNotificationsController,
    DiscussionboardSubscriptionsController,
    DiscussionboardMentionsController,
    DiscussionboardVotetypesController,
    DiscussionboardVotesController,
    DiscussionboardTagsController,
    DiscussionboardCategoriesController,
    DiscussionboardSearchhistoriesController,
  ],
})
export class MyModule {}
