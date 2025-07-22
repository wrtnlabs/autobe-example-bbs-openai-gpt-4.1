import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful and unsuccessful retrieval of a discussion board member's detailed profile.
 *
 * This test verifies that an admin or moderator can use an existing member's UUID
 * to retrieve complete account details, and checks privacy rules and error handling:
 *
 * 1. Create a member to obtain a valid UUID for testing.
 * 2. Retrieve the member profile by UUID and validate all expected fields are present and correct.
 * 3. Attempt to retrieve details using a random non-existent UUID (should return 404 or error).
 * 4. Skipped: Simulate a soft-delete and retry retrieval (not possible with current API set).
 * 5. Skipped: Restricted-access edge case for non-staff role (not possible with current API set).
 * 6. At each step, validate privacy by ensuring sensitive data is handled per requestor's role and audit policy. This typically means password/hash is never present and profile information is correct.
 */
export async function test_api_discussionBoard_test_get_member_details_with_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board member to obtain a valid UUID
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(32),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Retrieve the member details using their UUID
  const memberDetails = await api.functional.discussionBoard.members.getById(
    connection,
    { id: member.id },
  );
  typia.assert(memberDetails);

  // Validate all expected fields for the created member
  TestValidator.equals("id matches")(memberDetails.id)(member.id);
  TestValidator.equals("username matches")(memberDetails.username)(memberInput.username);
  TestValidator.equals("email matches")(memberDetails.email)(memberInput.email);
  TestValidator.equals("display_name matches")(memberDetails.display_name)(memberInput.display_name);
  TestValidator.equals("is_active default true")(memberDetails.is_active)(true);
  TestValidator.equals("profile_image_url")(memberDetails.profile_image_url ?? null)(null);
  // Should never include hashed_password anywhere (by output type)

  // 3. Attempt to retrieve details with a random, non-existent UUID
  await TestValidator.error("404 for non-existent member")(async () => {
    await api.functional.discussionBoard.members.getById(
      connection,
      { id: typia.random<string & tags.Format<"uuid">>() },
    );
  });

  // 4. Skipped: Soft-deleted member retrieval (no API available)
  // 5. Skipped: Role/permission restriction edge case (no auth API support)
}