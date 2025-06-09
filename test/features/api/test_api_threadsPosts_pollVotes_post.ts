import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IThreadsPostsPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPollVote";

export async function test_api_threadsPosts_pollVotes_post(
  connection: api.IConnection,
) {
  const output: IThreadsPostsPollVote =
    await api.functional.threadsPosts.pollVotes.post(connection, {
      body: typia.random<IThreadsPostsPollVote.ICreate>(),
    });
  typia.assert(output);
}
