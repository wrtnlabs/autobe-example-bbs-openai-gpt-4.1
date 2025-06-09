import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDeleteConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeleteConfirmation";

export async function test_api_threadsPosts_postEdits_eraseById(
  connection: api.IConnection,
) {
  const output: IDeleteConfirmation =
    await api.functional.threadsPosts.postEdits.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
