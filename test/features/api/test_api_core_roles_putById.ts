import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRole";

export async function test_api_core_roles_putById(connection: api.IConnection) {
  const output: IRole = await api.functional.core.roles.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IRole.IUpdate>(),
  });
  typia.assert(output);
}
