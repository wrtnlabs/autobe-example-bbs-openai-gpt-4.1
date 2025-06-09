import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIThreadsPostsPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIThreadsPostsPollOption";
import { IThreadsPostsPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadsPostsPollOption";

export async function test_api_threadsPosts_pollOptions_patch(
  connection: api.IConnection,
) {
  const output: IPageIThreadsPostsPollOption =
    await api.functional.threadsPosts.pollOptions.patch(connection, {
      body: typia.random<IThreadsPostsPollOption.IRequest>(),
    });
  typia.assert(output);
}
