import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserProfile";
import { IDiscussionBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserProfile";

export async function test_api_discussionBoard_userProfiles_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardUserProfile =
    await api.functional.discussionBoard.userProfiles.patch(connection, {
      body: typia.random<IDiscussionBoardUserProfile.IRequest>(),
    });
  typia.assert(output);
}
