import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IBan";

export async function test_api_moderation_bans_post(
  connection: api.IConnection,
) {
  const output: IBan = await api.functional.moderation.bans.post(connection, {
    body: typia.random<IBan.ICreate>(),
  });
  typia.assert(output);
}
