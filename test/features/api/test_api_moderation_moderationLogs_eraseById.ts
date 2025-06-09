import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerationLog";

export async function test_api_moderation_moderationLogs_eraseById(
  connection: api.IConnection,
) {
  const output: IModerationLog.IDeleteResult =
    await api.functional.moderation.moderationLogs.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
