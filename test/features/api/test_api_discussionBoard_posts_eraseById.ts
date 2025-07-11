import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_discussionBoard_posts_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPost =
    await api.functional.discussionBoard.posts.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
