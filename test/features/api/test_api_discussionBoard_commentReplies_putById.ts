import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";

export async function test_api_discussionBoard_commentReplies_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardCommentReply =
    await api.functional.discussionBoard.commentReplies.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardCommentReply.IUpdate>(),
    });
  typia.assert(output);
}
