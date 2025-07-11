import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";

export async function test_api_discussionBoard_userBans_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserBan =
    await api.functional.discussionBoard.userBans.post(connection, {
      body: typia.random<IDiscussionBoardUserBan.ICreate>(),
    });
  typia.assert(output);
}
