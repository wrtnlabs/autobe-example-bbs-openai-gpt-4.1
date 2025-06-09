import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThreadsPostsPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPoll";

export async function test_api_threadsPosts_polls_putById(
  connection: api.IConnection,
) {
  const output: IThreadsPostsPoll =
    await api.functional.threadsPosts.polls.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IThreadsPostsPoll.IUpdate>(),
    });
  typia.assert(output);
}
