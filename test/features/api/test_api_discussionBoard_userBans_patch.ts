import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";

export async function test_api_discussionBoard_userBans_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardUserBan =
    await api.functional.discussionBoard.userBans.patch(connection, {
      body: typia.random<IDiscussionBoardUserBan.IRequest>(),
    });
  typia.assert(output);
}
