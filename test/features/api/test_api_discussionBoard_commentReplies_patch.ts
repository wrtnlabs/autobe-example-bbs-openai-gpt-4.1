import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentReply";
import { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";

export async function test_api_discussionBoard_commentReplies_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardCommentReply =
    await api.functional.discussionBoard.commentReplies.patch(connection, {
      body: typia.random<IDiscussionBoardCommentReply.IRequest>(),
    });
  typia.assert(output);
}
