import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

export async function test_api_discussionBoard_notifications_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.notifications.patch(connection, {
      body: typia.random<IDiscussionBoardNotification.IRequest>(),
    });
  typia.assert(output);
}
