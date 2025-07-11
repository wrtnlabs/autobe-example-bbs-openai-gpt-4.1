import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_discussionBoard_users_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUser =
    await api.functional.discussionBoard.users.post(connection, {
      body: typia.random<IDiscussionBoardUser.ICreate>(),
    });
  typia.assert(output);
}
