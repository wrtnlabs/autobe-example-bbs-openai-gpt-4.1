import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IBan";

export async function test_api_moderation_bans_eraseById(
  connection: api.IConnection,
) {
  const output: IBan = await api.functional.moderation.bans.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
