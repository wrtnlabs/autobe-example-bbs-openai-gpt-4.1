import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIThread";
import { IThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IThread";

export async function test_api_threadsPosts_threads_patch(
  connection: api.IConnection,
) {
  const output: IPageIThread.ISummary =
    await api.functional.threadsPosts.threads.patch(connection, {
      body: typia.random<IThread.IRequest>(),
    });
  typia.assert(output);
}
