import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostVote";

export async function test_api_threadsPosts_postVotes_post(
  connection: api.IConnection,
) {
  const output: IPostVote = await api.functional.threadsPosts.postVotes.post(
    connection,
    {
      body: typia.random<IPostVote.ICreate>(),
    },
  );
  typia.assert(output);
}
