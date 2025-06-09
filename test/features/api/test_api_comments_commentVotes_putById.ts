import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentVote";

export async function test_api_comments_commentVotes_putById(
  connection: api.IConnection,
) {
  const output: ICommentVote =
    await api.functional.comments.commentVotes.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommentVote.IUpdate>(),
    });
  typia.assert(output);
}
