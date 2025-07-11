import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_discussionBoard_users_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardUser =
    await api.functional.discussionBoard.users.patch(connection, {
      body: typia.random<IDiscussionBoardUser.IRequest>(),
    });
  typia.assert(output);
}
