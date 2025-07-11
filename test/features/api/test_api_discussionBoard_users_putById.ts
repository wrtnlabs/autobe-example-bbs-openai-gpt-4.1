import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_discussionBoard_users_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUser =
    await api.functional.discussionBoard.users.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardUser.IUpdate>(),
    });
  typia.assert(output);
}
