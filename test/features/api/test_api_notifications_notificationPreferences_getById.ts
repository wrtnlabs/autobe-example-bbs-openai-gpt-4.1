import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { INotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationPreference";

export async function test_api_notifications_notificationPreferences_getById(
  connection: api.IConnection,
) {
  const output: INotificationPreference =
    await api.functional.notifications.notificationPreferences.getById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
