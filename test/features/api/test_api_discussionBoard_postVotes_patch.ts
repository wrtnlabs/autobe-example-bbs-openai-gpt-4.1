import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageDiscussionBoardPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageDiscussionBoardPostVote";
import { IDiscussionBoardPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVote";

export async function test_api_discussionBoard_postVotes_patch(
  connection: api.IConnection,
) {
  const output: IPageDiscussionBoardPostVote =
    await api.functional.discussionBoard.postVotes.patch(connection, {
      body: typia.random<IDiscussionBoardPostVote.IRequest>(),
    });
  typia.assert(output);
}
