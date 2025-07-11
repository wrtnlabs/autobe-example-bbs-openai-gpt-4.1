import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

export async function test_api_discussionBoard_moderationActions_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderationActions.post(connection, {
      body: typia.random<IDiscussionBoardModerationAction.ICreate>(),
    });
  typia.assert(output);
}
