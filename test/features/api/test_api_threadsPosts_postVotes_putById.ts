import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostVote";

export async function test_api_threadsPosts_postVotes_putById(
  connection: api.IConnection,
) {
  const output: IPostVote = await api.functional.threadsPosts.postVotes.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IPostVote.IUpdate>(),
    },
  );
  typia.assert(output);
}
