import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVote";

export async function test_api_discussionBoard_postVotes_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPostVote =
    await api.functional.discussionBoard.postVotes.post(connection, {
      body: typia.random<IDiscussionBoardPostVote.ICreate>(),
    });
  typia.assert(output);
}
