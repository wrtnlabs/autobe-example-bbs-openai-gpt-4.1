import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageINotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotification";
import { INotification } from "@ORGANIZATION/PROJECT-api/lib/structures/INotification";

export async function test_api_notifications_notifications_patch(
  connection: api.IConnection,
) {
  const output: IPageINotification =
    await api.functional.notifications.notifications.patch(connection, {
      body: typia.random<INotification.IRequest>(),
    });
  typia.assert(output);
}
