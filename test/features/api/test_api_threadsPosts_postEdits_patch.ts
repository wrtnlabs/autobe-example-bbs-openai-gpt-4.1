import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPostEdit";
import { IPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostEdit";

export async function test_api_threadsPosts_postEdits_patch(
  connection: api.IConnection,
) {
  const output: IPageIPostEdit =
    await api.functional.threadsPosts.postEdits.patch(connection, {
      body: typia.random<IPostEdit.IRequest>(),
    });
  typia.assert(output);
}
