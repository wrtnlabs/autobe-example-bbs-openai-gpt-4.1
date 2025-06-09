import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThreadsPostsPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPollOption";

export async function test_api_threadsPosts_pollOptions_eraseById(
  connection: api.IConnection,
) {
  const output: IThreadsPostsPollOption =
    await api.functional.threadsPosts.pollOptions.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
