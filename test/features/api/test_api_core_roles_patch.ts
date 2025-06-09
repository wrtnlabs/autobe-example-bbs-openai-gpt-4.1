import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRole";
import { IRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRole";

export async function test_api_core_roles_patch(connection: api.IConnection) {
  const output: IPageIRole = await api.functional.core.roles.patch(connection, {
    body: typia.random<IRole.IRequest>(),
  });
  typia.assert(output);
}
