import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserWarning";

export async function test_api_moderation_userWarnings_putById(
  connection: api.IConnection,
) {
  const output: IUserWarning =
    await api.functional.moderation.userWarnings.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserWarning.IUpdate>(),
    });
  typia.assert(output);
}
