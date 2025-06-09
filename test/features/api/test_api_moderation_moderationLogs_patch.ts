import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIModerationLog";
import { IModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerationLog";

export async function test_api_moderation_moderationLogs_patch(
  connection: api.IConnection,
) {
  const output: IPageIModerationLog =
    await api.functional.moderation.moderationLogs.patch(connection, {
      body: typia.random<IModerationLog.IRequest>(),
    });
  typia.assert(output);
}
