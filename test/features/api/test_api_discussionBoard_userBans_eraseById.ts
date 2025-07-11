import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";

export async function test_api_discussionBoard_userBans_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUserBan =
    await api.functional.discussionBoard.userBans.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
