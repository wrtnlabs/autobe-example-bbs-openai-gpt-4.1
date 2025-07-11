import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

export async function test_api_discussionBoard_comments_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardComment =
    await api.functional.discussionBoard.comments.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardComment.IUpdate>(),
    });
  typia.assert(output);
}
