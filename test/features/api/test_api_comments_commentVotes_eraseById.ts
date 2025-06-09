import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentVote";

export async function test_api_comments_commentVotes_eraseById(
  connection: api.IConnection,
) {
  const output: ICommentVote.IDeleteResult =
    await api.functional.comments.commentVotes.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
