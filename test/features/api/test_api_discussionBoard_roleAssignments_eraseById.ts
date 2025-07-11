import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRoleAssignment";

export async function test_api_discussionBoard_roleAssignments_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardRoleAssignment =
    await api.functional.discussionBoard.roleAssignments.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
