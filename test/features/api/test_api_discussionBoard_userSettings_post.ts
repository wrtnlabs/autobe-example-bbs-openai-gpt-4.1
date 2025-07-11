import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardUserSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSetting";

export async function test_api_discussionBoard_userSettings_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserSetting =
    await api.functional.discussionBoard.userSettings.post(connection, {
      body: typia.random<IDiscussionBoardUserSetting.ICreate>(),
    });
  typia.assert(output);
}
