import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerationLog";

export async function test_api_moderation_moderationLogs_post(
  connection: api.IConnection,
) {
  const output: IModerationLog =
    await api.functional.moderation.moderationLogs.post(connection, {
      body: typia.random<IModerationLog.ICreate>(),
    });
  typia.assert(output);
}
