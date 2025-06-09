import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoll";

export async function test_api_threadsPosts_polls_post(
  connection: api.IConnection,
) {
  const output: IPoll = await api.functional.threadsPosts.polls.post(
    connection,
    {
      body: typia.random<IPoll.ICreate>(),
    },
  );
  typia.assert(output);
}
