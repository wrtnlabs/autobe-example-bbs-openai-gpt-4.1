import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostEdit";

export async function test_api_threadsPosts_postEdits_putById(
  connection: api.IConnection,
) {
  const output: IPostEdit = await api.functional.threadsPosts.postEdits.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IPostEdit.IUpdate>(),
    },
  );
  typia.assert(output);
}
