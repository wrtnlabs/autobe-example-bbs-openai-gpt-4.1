import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostEdit";

export async function test_api_threadsPosts_postEdits_post(
  connection: api.IConnection,
) {
  const output: IPostEdit = await api.functional.threadsPosts.postEdits.post(
    connection,
    {
      body: typia.random<IPostEdit.ICreate>(),
    },
  );
  typia.assert(output);
}
