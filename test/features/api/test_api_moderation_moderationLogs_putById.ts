import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerationLog";

export async function test_api_moderation_moderationLogs_putById(
  connection: api.IConnection,
) {
  const output: IModerationLog =
    await api.functional.moderation.moderationLogs.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IModerationLog.IUpdate>(),
    });
  typia.assert(output);
}
