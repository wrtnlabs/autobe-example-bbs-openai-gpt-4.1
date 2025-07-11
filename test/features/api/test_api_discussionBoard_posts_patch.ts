import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageDiscussionBoardPost";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_discussionBoard_posts_patch(
  connection: api.IConnection,
) {
  const output: IPageDiscussionBoardPost =
    await api.functional.discussionBoard.posts.patch(connection, {
      body: typia.random<IDiscussionBoardPost.IRequest>(),
    });
  typia.assert(output);
}
