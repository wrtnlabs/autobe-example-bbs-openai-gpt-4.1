import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_discussionBoard_users_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardUser =
    await api.functional.discussionBoard.users.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
