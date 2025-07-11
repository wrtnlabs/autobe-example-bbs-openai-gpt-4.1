import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussionBoard_admins_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardAdmin =
    await api.functional.discussionBoard.admins.patch(connection, {
      body: typia.random<IDiscussionBoardAdmin.IRequest>(),
    });
  typia.assert(output);
}
