import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { INotification } from "@ORGANIZATION/PROJECT-api/lib/structures/INotification";

export async function test_api_notifications_notifications_post(
  connection: api.IConnection,
) {
  const output: INotification =
    await api.functional.notifications.notifications.post(connection, {
      body: typia.random<INotification.ICreate>(),
    });
  typia.assert(output);
}
