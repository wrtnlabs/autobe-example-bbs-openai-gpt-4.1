import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test update failure for member PUT API due to invalid body content.
 *
 * This verifies that the admin endpoint for updating a Discussion Board Member
 * properly rejects requests with bodies that violate schema constraints (e.g.,
 * null for non-nullable fields, invalid types, or missing all updatable
 * fields). The primary goal is to ensure validation errors are triggered and
 * that no update is performed when such invalid data is submitted.
 *
 * Steps:
 *
 * 1. Provision a real member via the POST endpoint (dependency)
 * 2. Attempt to update with a body where all properties are omitted (i.e., empty
 *    object)
 *
 *    - Should fail with a validation or client error, confirming absence of
 *         updatable data is not permitted
 * 3. Attempt to update with a body containing a non-nullable field set to null or
 *    invalid type
 *
 *    - E.g., { user_identifier: null } or { joined_at: 123 }
 *    - Should fail with validation/client error
 * 4. (Optional) If a GET endpoint exists, re-fetch the member after each failure
 *    to confirm it remains unchanged
 * 5. Assert that errors occur and that the record was not modified by the invalid
 *    requests
 */
export async function test_api_discussionBoard_admin_members_test_update_member_with_invalid_request_body(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member
  const createBody: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(10),
    joined_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: createBody },
  );
  typia.assert(member);

  // Store original member for post-conditions
  const originalMember = { ...member };

  // Step 2: Attempt update with empty body {}
  await TestValidator.error("empty body fails")(() =>
    api.functional.discussionBoard.admin.members.update(connection, {
      memberId: member.id,
      body: {}, // nothing provided (invalid: at least one updatable field should exist)
    }),
  );

  // Step 3: Attempt update with user_identifier: null (violates non-nullable string requirement)
  await TestValidator.error("null user_identifier fails")(() =>
    api.functional.discussionBoard.admin.members.update(connection, {
      memberId: member.id,
      body: { user_identifier: null },
    }),
  );

  // Step 3b: Attempt update with joined_at: 123 (invalid type)
  await TestValidator.error("invalid joined_at type fails")(() =>
    api.functional.discussionBoard.admin.members.update(connection, {
      memberId: member.id,
      body: { joined_at: 123 as any }, // number instead of ISO string
    }),
  );

  // Optionally, verify that the member was not changed (requires GET endpoint, not present as per materials)
  // If a GET endpoint existed, we would refetch and assert equality with originalMember here.
}
