import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";

export async function test_api_core_users_eraseById(
  connection: api.IConnection,
) {
  const output: IUser.IDeleteResponse =
    await api.functional.core.users.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
