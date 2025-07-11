import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVote";

export async function test_api_discussionBoard_postVotes_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPostVote =
    await api.functional.discussionBoard.postVotes.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardPostVote.IUpdate>(),
    });
  typia.assert(output);
}
