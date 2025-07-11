import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserProfile";

export async function test_api_discussionBoard_userProfiles_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserProfile =
    await api.functional.discussionBoard.userProfiles.post(connection, {
      body: typia.random<IDiscussionBoardUserProfile.ICreate>(),
    });
  typia.assert(output);
}
