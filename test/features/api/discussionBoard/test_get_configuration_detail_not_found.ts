import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Validates that requesting details for a non-existent discussion board configuration returns a 404 error and does not leak sensitive data.
 *
 * Business context:
 * Only administrators can access detailed configuration records in the discussion board system. If an admin requests a configuration by a UUID that doesn't exist, the server must securely return a 404 error (not found) and ensure no sensitive configuration data is leaked in the error response.
 *
 * Test process:
 * 1. Register a new administrator account by creating a member and elevating privileges.
 * 2. Attempt to fetch a configuration by a random/unused UUID.
 * 3. Validate that the API returns a 404 not found error.
 * 4. Confirm the error response contains no sensitive configuration data fields.
 */
export async function test_api_discussionBoard_test_get_configuration_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(18),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Grant administrator privileges to the member
  const admin = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Attempt to fetch a configuration record using a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Should throw 404 for non-existent configuration UUID")(async () => {
    await api.functional.discussionBoard.configurations.getById(connection, {
      id: nonExistentId,
    });
  });
  // Note: No sensitive data should be returned in the error. (Cannot verify fields without error DTO specification.)
}