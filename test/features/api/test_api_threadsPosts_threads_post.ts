import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IThread";

export async function test_api_threadsPosts_threads_post(
  connection: api.IConnection,
) {
  const output: IThread = await api.functional.threadsPosts.threads.post(
    connection,
    {
      body: typia.random<IThread.ICreate>(),
    },
  );
  typia.assert(output);
}
