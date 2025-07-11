import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRoleAssignment";
import { IDiscussionBoardRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRoleAssignment";

export async function test_api_discussionBoard_roleAssignments_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardRoleAssignment =
    await api.functional.discussionBoard.roleAssignments.patch(connection, {
      body: typia.random<IDiscussionBoardRoleAssignment.IRequest>(),
    });
  typia.assert(output);
}
