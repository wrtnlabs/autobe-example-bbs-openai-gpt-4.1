import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IThread";

export async function test_api_threadsPosts_threads_putById(
  connection: api.IConnection,
) {
  const output: IThread = await api.functional.threadsPosts.threads.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IThread.IUpdate>(),
    },
  );
  typia.assert(output);
}
