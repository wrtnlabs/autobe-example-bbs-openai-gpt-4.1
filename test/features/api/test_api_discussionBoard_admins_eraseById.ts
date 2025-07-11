import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussionBoard_admins_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admins.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
