import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";

export async function test_api_discussionBoard_commentVotes_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardCommentVote =
    await api.functional.discussionBoard.commentVotes.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
