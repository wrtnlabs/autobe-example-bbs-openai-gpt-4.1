import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThreadsPostsPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPollVote";

export async function test_api_threadsPosts_pollVotes_putById(
  connection: api.IConnection,
) {
  const output: IThreadsPostsPollVote =
    await api.functional.threadsPosts.pollVotes.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IThreadsPostsPollVote.IUpdate>(),
    });
  typia.assert(output);
}
