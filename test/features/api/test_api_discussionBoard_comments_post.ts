import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

export async function test_api_discussionBoard_comments_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardComment =
    await api.functional.discussionBoard.comments.post(connection, {
      body: typia.random<IDiscussionBoardComment.ICreate>(),
    });
  typia.assert(output);
}
