import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_discussionBoard_moderators_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderators.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
