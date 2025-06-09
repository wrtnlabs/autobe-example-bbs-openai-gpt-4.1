import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRole";

export async function test_api_core_roles_post(connection: api.IConnection) {
  const output: IRole = await api.functional.core.roles.post(connection, {
    body: typia.random<IRole.ICreate>(),
  });
  typia.assert(output);
}
