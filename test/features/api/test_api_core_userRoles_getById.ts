import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserRole";

export async function test_api_core_userRoles_getById(
  connection: api.IConnection,
) {
  const output: IUserRole = await api.functional.core.userRoles.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
