import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommentVote";
import { ICommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentVote";

export async function test_api_comments_commentVotes_patch(
  connection: api.IConnection,
) {
  const output: IPageICommentVote =
    await api.functional.comments.commentVotes.patch(connection, {
      body: typia.random<ICommentVote.IRequest>(),
    });
  typia.assert(output);
}
