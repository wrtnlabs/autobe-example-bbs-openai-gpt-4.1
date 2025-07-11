import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserProfile";

export async function test_api_discussionBoard_userProfiles_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserProfile =
    await api.functional.discussionBoard.userProfiles.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardUserProfile.IUpdate>(),
    });
  typia.assert(output);
}
