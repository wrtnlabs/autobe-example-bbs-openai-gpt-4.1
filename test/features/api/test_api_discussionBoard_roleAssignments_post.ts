import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRoleAssignment";

export async function test_api_discussionBoard_roleAssignments_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardRoleAssignment =
    await api.functional.discussionBoard.roleAssignments.post(connection, {
      body: typia.random<IDiscussionBoardRoleAssignment.ICreate>(),
    });
  typia.assert(output);
}
