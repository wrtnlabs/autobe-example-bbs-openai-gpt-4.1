import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { INotification } from "@ORGANIZATION/PROJECT-api/lib/structures/INotification";

export async function test_api_notifications_notifications_getById(
  connection: api.IConnection,
) {
  const output: INotification =
    await api.functional.notifications.notifications.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
