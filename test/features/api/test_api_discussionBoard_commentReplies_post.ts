import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";

export async function test_api_discussionBoard_commentReplies_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardCommentReply =
    await api.functional.discussionBoard.commentReplies.post(connection, {
      body: typia.random<IDiscussionBoardCommentReply.ICreate>(),
    });
  typia.assert(output);
}
