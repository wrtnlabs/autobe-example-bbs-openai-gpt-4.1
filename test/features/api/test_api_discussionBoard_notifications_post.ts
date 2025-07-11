import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

export async function test_api_discussionBoard_notifications_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardNotification =
    await api.functional.discussionBoard.notifications.post(connection, {
      body: typia.random<IDiscussionBoardNotification.ICreate>(),
    });
  typia.assert(output);
}
