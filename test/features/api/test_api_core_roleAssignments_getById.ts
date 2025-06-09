import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleAssignment";

export async function test_api_core_roleAssignments_getById(
  connection: api.IConnection,
) {
  const output: IRoleAssignment =
    await api.functional.core.roleAssignments.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
