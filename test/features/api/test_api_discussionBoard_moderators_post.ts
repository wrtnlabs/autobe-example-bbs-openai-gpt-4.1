import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_discussionBoard_moderators_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderators.post(connection, {
      body: typia.random<IDiscussionBoardModerator.ICreate>(),
    });
  typia.assert(output);
}
