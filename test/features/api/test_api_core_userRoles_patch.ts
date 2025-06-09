import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserRole";
import { IUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserRole";

export async function test_api_core_userRoles_patch(
  connection: api.IConnection,
) {
  const output: IPageIUserRole = await api.functional.core.userRoles.patch(
    connection,
    {
      body: typia.random<IUserRole.IRequest>(),
    },
  );
  typia.assert(output);
}
