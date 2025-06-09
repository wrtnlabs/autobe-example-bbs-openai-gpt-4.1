import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";

export async function test_api_core_users_putById(connection: api.IConnection) {
  const output: IUser = await api.functional.core.users.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IUser.IUpdate>(),
  });
  typia.assert(output);
}
