import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test detailed retrieval of administrator assignment records and RBAC access enforcement.
 *
 * This test targets the endpoint GET /discussionBoard/administrators/{id} and verifies proper administrator access and error handling for both valid and invalid UUIDs.
 *
 * Steps:
 * 1. Create a new board member (to be assigned as admin)
 * 2. Assign administrator role to this member and capture the returned admin assignment UUID
 * 3. As administrator, fetch administrator assignment by ID and verify returned data matches assignment/member linkage and contains assignment timestamps
 * 4. Attempt to fetch a non-existent administrator assignment and confirm 404 error response
 * 5. Confirm all returned records (for valid ID) include correct member link and assignment timestamps.
 * 6. (RBAC checks for unauthorized roles omitted due to lack of user-role switching endpoints)
 */
export async function test_api_discussionBoard_test_get_administrator_assignment_details_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. Create a member to be assigned as administrator
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphabets(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member);

  // 2. Assign administrator
  const adminAssignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: member.id },
  });
  typia.assert(adminAssignment);

  // 3. Fetch administrator assignment by ID (should succeed)
  const fetched = await api.functional.discussionBoard.administrators.getById(connection, {
    id: adminAssignment.id,
  });
  typia.assert(fetched);
  TestValidator.equals("administrator assignment ID")(fetched.id)(adminAssignment.id);
  TestValidator.equals("linked member ID")(fetched.member_id)(member.id);
  TestValidator.equals("linked member in assignment")(fetched.member?.id)(member.id);
  TestValidator.predicate("assignment timestamp present")(!!fetched.assigned_at);

  // 4. Attempt fetch with non-existent (random) UUID, should 404
  await TestValidator.error("404 not found for invalid admin UUID")(() =>
    api.functional.discussionBoard.administrators.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 5. (RBAC for non-admin, revoked/deleted, and access denial omitted: SDK lacks user auth/role switch)
}