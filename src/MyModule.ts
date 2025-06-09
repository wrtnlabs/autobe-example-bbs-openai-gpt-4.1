import { Module } from "@nestjs/common";

import { CoreUsersController } from "./controllers/core/users/CoreUsersController";
import { CoreUserrolesController } from "./controllers/core/userRoles/CoreUserrolesController";
import { CoreCategoriesController } from "./controllers/core/categories/CoreCategoriesController";
import { PostsPostsController } from "./controllers/posts/posts/PostsPostsController";
import { PostsCommentsController } from "./controllers/posts/comments/PostsCommentsController";
import { VotesVotesController } from "./controllers/votes/votes/VotesVotesController";

@Module({
  controllers: [
    CoreUsersController,
    CoreUserrolesController,
    CoreCategoriesController,
    PostsPostsController,
    PostsCommentsController,
    VotesVotesController,
  ],
})
export class MyModule {}
