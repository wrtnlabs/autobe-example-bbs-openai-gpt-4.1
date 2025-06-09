import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUser";
import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";

export async function test_api_core_users_patch(connection: api.IConnection) {
  const output: IPageIUser = await api.functional.core.users.patch(connection, {
    body: typia.random<IUser.IRequest>(),
  });
  typia.assert(output);
}
