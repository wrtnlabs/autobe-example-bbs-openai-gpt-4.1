import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardUserSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSetting";
import { IDiscussionBoardUserSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSetting";

export async function test_api_discussionBoard_userSettings_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardUserSetting =
    await api.functional.discussionBoard.userSettings.patch(connection, {
      body: typia.random<IDiscussionBoardUserSetting.IRequest>(),
    });
  typia.assert(output);
}
