import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

export async function test_api_discussionBoard_moderationActions_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderationActions.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardModerationAction.IUpdate>(),
    });
  typia.assert(output);
}
