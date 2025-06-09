import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoll";

export async function test_api_threadsPosts_polls_getById(
  connection: api.IConnection,
) {
  const output: IPoll = await api.functional.threadsPosts.polls.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
