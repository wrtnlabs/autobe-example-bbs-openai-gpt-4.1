import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

export async function test_api_discussionBoard_notifications_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardNotification =
    await api.functional.discussionBoard.notifications.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardNotification.IUpdate>(),
    });
  typia.assert(output);
}
