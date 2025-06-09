import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IThreadsPostsPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPollOption";

export async function test_api_threadsPosts_pollOptions_post(
  connection: api.IConnection,
) {
  const output: IThreadsPostsPollOption =
    await api.functional.threadsPosts.pollOptions.post(connection, {
      body: typia.random<IThreadsPostsPollOption.ICreate>(),
    });
  typia.assert(output);
}
