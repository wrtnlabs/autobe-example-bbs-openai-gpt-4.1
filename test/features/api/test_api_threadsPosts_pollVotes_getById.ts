import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThreadsPostsPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPollVote";

export async function test_api_threadsPosts_pollVotes_getById(
  connection: api.IConnection,
) {
  const output: IThreadsPostsPollVote =
    await api.functional.threadsPosts.pollVotes.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
