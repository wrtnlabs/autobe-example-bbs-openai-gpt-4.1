import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussionBoard_admins_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admins.post(connection, {
      body: typia.random<IDiscussionBoardAdmin.ICreate>(),
    });
  typia.assert(output);
}
