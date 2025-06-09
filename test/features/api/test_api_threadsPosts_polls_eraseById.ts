import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThreadsPostsPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPoll";

export async function test_api_threadsPosts_polls_eraseById(
  connection: api.IConnection,
) {
  const output: IThreadsPostsPoll =
    await api.functional.threadsPosts.polls.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
