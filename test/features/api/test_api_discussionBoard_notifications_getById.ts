import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

export async function test_api_discussionBoard_notifications_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardNotification =
    await api.functional.discussionBoard.notifications.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
