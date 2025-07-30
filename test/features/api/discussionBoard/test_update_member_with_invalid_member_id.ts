import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate failure on updating a discussion board member with an invalid
 * memberId.
 *
 * Simulates an admin attempting to perform a member update where the target
 * memberId does not exist in the system. The test ensures that the correct
 * not-found error is thrown and that the system's error handling for resource
 * absence is robust.
 *
 * Steps:
 *
 * 1. Generate a random, guaranteed non-existent UUID for memberId.
 * 2. Construct a valid member update body with arbitrary values.
 * 3. Attempt to update a member using this bogus memberId via the admin endpoint.
 * 4. Assert that a not-found error is thrown, confirming no update is permitted
 *    and error handling is correct.
 */
export async function test_api_discussionBoard_test_update_member_with_invalid_member_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID (non-existent memberId)
  const fakeMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid update body
  const updateBody: IDiscussionBoardMember.IUpdate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
    suspended_at: null,
  };

  // 3. Attempt update and assert that a not-found error is thrown
  await TestValidator.error(
    "updating non-existent member results in not-found error",
  )(() =>
    api.functional.discussionBoard.admin.members.update(connection, {
      memberId: fakeMemberId,
      body: updateBody,
    }),
  );
}
