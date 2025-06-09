import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserRole";

export async function test_api_core_userRoles_post(
  connection: api.IConnection,
) {
  const output: IUserRole = await api.functional.core.userRoles.post(
    connection,
    {
      body: typia.random<IUserRole.ICreate>(),
    },
  );
  typia.assert(output);
}
