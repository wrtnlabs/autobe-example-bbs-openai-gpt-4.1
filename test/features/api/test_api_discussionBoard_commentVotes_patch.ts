import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageDiscussionBoardCommentVote";
import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";

export async function test_api_discussionBoard_commentVotes_patch(
  connection: api.IConnection,
) {
  const output: IPageDiscussionBoardCommentVote =
    await api.functional.discussionBoard.commentVotes.patch(connection, {
      body: typia.random<IDiscussionBoardCommentVote.IRequest>(),
    });
  typia.assert(output);
}
