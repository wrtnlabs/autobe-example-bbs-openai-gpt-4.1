import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserRole";

export async function test_api_core_userRoles_putById(
  connection: api.IConnection,
) {
  const output: IUserRole = await api.functional.core.userRoles.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserRole.IUpdate>(),
    },
  );
  typia.assert(output);
}
