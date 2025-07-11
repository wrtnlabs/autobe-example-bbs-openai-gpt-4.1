import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRoleAssignment";

export async function test_api_discussionBoard_roleAssignments_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardRoleAssignment =
    await api.functional.discussionBoard.roleAssignments.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardRoleAssignment.IUpdate>(),
    });
  typia.assert(output);
}
