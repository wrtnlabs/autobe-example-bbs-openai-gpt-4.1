import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoll";
import { IPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoll";

export async function test_api_threadsPosts_polls_patch(
  connection: api.IConnection,
) {
  const output: IPageIPoll = await api.functional.threadsPosts.polls.patch(
    connection,
    {
      body: typia.random<IPoll.IRequest>(),
    },
  );
  typia.assert(output);
}
