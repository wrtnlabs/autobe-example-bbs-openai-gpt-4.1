import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserRole";

export async function test_api_core_userRoles_eraseById(
  connection: api.IConnection,
) {
  const output: IUserRole.IDeleteResponse =
    await api.functional.core.userRoles.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
