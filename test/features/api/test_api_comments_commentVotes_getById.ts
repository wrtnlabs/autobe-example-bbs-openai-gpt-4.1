import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentVote";

export async function test_api_comments_commentVotes_getById(
  connection: api.IConnection,
) {
  const output: ICommentVote =
    await api.functional.comments.commentVotes.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
