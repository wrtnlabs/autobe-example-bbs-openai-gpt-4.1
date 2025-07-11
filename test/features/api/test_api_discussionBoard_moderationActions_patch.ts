import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

export async function test_api_discussionBoard_moderationActions_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderationActions.patch(connection, {
      body: typia.random<IDiscussionBoardModerationAction.IRequest>(),
    });
  typia.assert(output);
}
