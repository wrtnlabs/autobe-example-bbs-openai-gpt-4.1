import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_discussionBoard_posts_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPost =
    await api.functional.discussionBoard.posts.post(connection, {
      body: typia.random<IDiscussionBoardPost.ICreate>(),
    });
  typia.assert(output);
}
