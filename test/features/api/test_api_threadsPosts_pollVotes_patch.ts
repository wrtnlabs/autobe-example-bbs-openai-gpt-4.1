import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIThreadsPostsPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIThreadsPostsPollVote";
import { IThreadsPostsPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPollVote";

export async function test_api_threadsPosts_pollVotes_patch(
  connection: api.IConnection,
) {
  const output: IPageIThreadsPostsPollVote =
    await api.functional.threadsPosts.pollVotes.patch(connection, {
      body: typia.random<IThreadsPostsPollVote.IRequest>(),
    });
  typia.assert(output);
}
