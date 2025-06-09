import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRoleAssignment";
import { IRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleAssignment";

export async function test_api_core_roleAssignments_patch(
  connection: api.IConnection,
) {
  const output: IPageIRoleAssignment =
    await api.functional.core.roleAssignments.patch(connection, {
      body: typia.random<IRoleAssignment.IRequest>(),
    });
  typia.assert(output);
}
