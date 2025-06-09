import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostEdit";

export async function test_api_threadsPosts_postEdits_getById(
  connection: api.IConnection,
) {
  const output: IPostEdit = await api.functional.threadsPosts.postEdits.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
