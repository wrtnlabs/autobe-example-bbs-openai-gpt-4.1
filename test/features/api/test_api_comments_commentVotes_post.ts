import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentVote";

export async function test_api_comments_commentVotes_post(
  connection: api.IConnection,
) {
  const output: ICommentVote = await api.functional.comments.commentVotes.post(
    connection,
    {
      body: typia.random<ICommentVote.ICreate>(),
    },
  );
  typia.assert(output);
}
