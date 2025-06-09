import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleAssignment";

export async function test_api_core_roleAssignments_post(
  connection: api.IConnection,
) {
  const output: IRoleAssignment =
    await api.functional.core.roleAssignments.post(connection, {
      body: typia.random<IRoleAssignment.ICreate>(),
    });
  typia.assert(output);
}
