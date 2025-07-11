import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

export async function test_api_discussionBoard_comments_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.comments.patch(connection, {
      body: typia.random<IDiscussionBoardComment.IRequest>(),
    });
  typia.assert(output);
}
