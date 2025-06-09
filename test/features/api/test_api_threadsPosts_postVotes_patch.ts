import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPostVote";
import { IPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostVote";

export async function test_api_threadsPosts_postVotes_patch(
  connection: api.IConnection,
) {
  const output: IPageIPostVote =
    await api.functional.threadsPosts.postVotes.patch(connection, {
      body: typia.random<IPostVote.IRequest>(),
    });
  typia.assert(output);
}
