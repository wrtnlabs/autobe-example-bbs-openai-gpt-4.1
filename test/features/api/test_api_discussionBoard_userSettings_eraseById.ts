import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardUserSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSetting";

export async function test_api_discussionBoard_userSettings_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserSetting =
    await api.functional.discussionBoard.userSettings.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
