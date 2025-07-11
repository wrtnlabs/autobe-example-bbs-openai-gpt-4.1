import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOperationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IOperationStatus";

export async function test_api_discussionBoard_userProfiles_eraseById(
  connection: api.IConnection,
) {
  const output: IOperationStatus =
    await api.functional.discussionBoard.userProfiles.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
