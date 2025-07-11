import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

export async function test_api_discussionBoard_comments_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardComment =
    await api.functional.discussionBoard.comments.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
