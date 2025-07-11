import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardUserSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSetting";

export async function test_api_discussionBoard_userSettings_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserSetting =
    await api.functional.discussionBoard.userSettings.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardUserSetting.IUpdate>(),
    });
  typia.assert(output);
}
