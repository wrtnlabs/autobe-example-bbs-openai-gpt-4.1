import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

export async function test_api_discussionBoard_moderationActions_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderationActions.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
