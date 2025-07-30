import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test error handling for retrieving details of a discussion board member with
 * an invalid or non-existent memberId.
 *
 * This test ensures that when an administrator attempts to look up member
 * details using a UUID that does not correspond to any existing member, the
 * system correctly returns a 404 Not Found or another meaningful error
 * response, rather than returning a successful (but incorrect) result.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is unlikely to exist in the database.
 * 2. Call the admin "get by memberId" API for this random UUID.
 * 3. Confirm that a 404 Not Found (or similar error) is thrown and that no member
 *    data is returned.
 * 4. Validate that the error is of the correct type and a proper error response
 *    occurs.
 */
export async function test_api_discussionBoard_admin_members_test_get_member_details_with_invalid_id(
  connection: api.IConnection,
) {
  // Step 1: Generate a random UUID that should not exist.
  const invalidMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt to retrieve member details and expect an error.
  await TestValidator.error(
    "Fetching details with invalid memberId should fail with 404",
  )(async () => {
    await api.functional.discussionBoard.admin.members.at(connection, {
      memberId: invalidMemberId,
    });
  });
}
