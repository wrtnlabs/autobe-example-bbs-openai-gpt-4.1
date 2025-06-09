import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserWarning";

export async function test_api_moderation_userWarnings_post(
  connection: api.IConnection,
) {
  const output: IUserWarning =
    await api.functional.moderation.userWarnings.post(connection, {
      body: typia.random<IUserWarning.ICreate>(),
    });
  typia.assert(output);
}
