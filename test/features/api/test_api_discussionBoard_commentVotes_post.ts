import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";

export async function test_api_discussionBoard_commentVotes_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardCommentVote =
    await api.functional.discussionBoard.commentVotes.post(connection, {
      body: typia.random<IDiscussionBoardCommentVote.ICreate>(),
    });
  typia.assert(output);
}
