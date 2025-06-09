import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageINotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationPreference";
import { INotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationPreference";

export async function test_api_notifications_notificationPreferences_patch(
  connection: api.IConnection,
) {
  const output: IPageINotificationPreference =
    await api.functional.notifications.notificationPreferences.patch(
      connection,
      {
        body: typia.random<INotificationPreference.IRequest>(),
      },
    );
  typia.assert(output);
}
