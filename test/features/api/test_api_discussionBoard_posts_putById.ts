import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_discussionBoard_posts_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPost =
    await api.functional.discussionBoard.posts.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardPost.IUpdate>(),
    });
  typia.assert(output);
}
