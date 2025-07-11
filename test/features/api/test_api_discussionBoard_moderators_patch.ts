import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_discussionBoard_moderators_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardModerator =
    await api.functional.discussionBoard.moderators.patch(connection, {
      body: typia.random<IDiscussionBoardModerator.IRequest>(),
    });
  typia.assert(output);
}
