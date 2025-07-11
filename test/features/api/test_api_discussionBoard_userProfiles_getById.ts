import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserProfile";

export async function test_api_discussionBoard_userProfiles_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserProfile =
    await api.functional.discussionBoard.userProfiles.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
