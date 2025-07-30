import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate permission denial when a non-admin attempts to access member details
 * via admin endpoint.
 *
 * This test ensures that a regular (non-admin) member cannot retrieve the
 * details of any board member using the admin-only endpoint
 * `/discussionBoard/admin/members/{memberId}`. This is critical for upholding
 * member privacy and enforcing correct access controls.
 *
 * Test steps:
 *
 * 1. As an admin, create a new discussion board member to set up a valid target
 *    member.
 * 2. Simulate a non-admin user session (i.e., do not perform any admin
 *    authentication or mimic a non-admin's connection context).
 * 3. Attempt to fetch the member details using
 *    `/discussionBoard/admin/members/{memberId}` as a non-admin.
 * 4. Verify that the response is an authorization error (forbidden), and no member
 *    details are returned.
 */
export async function test_api_discussionBoard_test_get_member_details_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member as admin (setup step)
  const member: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(10),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Simulate non-admin context (no admin login or token elevation)
  // 3. Attempt to retrieve the member details as a non-admin
  await TestValidator.error("Non-admin should receive forbidden error")(() =>
    api.functional.discussionBoard.admin.members.at(connection, {
      memberId: member.id,
    }),
  );
}
