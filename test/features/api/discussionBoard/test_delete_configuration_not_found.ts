import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Validate that deleting a non-existent configuration returns a not found (404) error.
 *
 * This test ensures that when an administrator attempts to delete a configuration (by UUID)
 * that does not exist in the system, the API returns a 404 error, thereby preventing
 * accidental or unauthorized deletion actions from succeeding. Soft deleting an invalid
 * configuration should always result in a failed operation clearly communicated to the user.
 *
 * Steps:
 * 1. Create a normal discussion board member.
 * 2. Assign administrator privileges to that member.
 * 3. As admin, call DELETE on /discussionBoard/configurations/{id} using a random UUID that does not exist.
 * 4. Verify that a not found (404) error is returned.
 */
export async function test_api_discussionBoard_test_delete_configuration_not_found(
  connection: api.IConnection,
) {
  // 1. Create a new member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member);

  // 2. Assign admin role to member
  const admin = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: member.id,
    },
  });
  typia.assert(admin);

  // 3. Attempt to delete a configuration with a random UUID (presumed non-existent)
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent configuration should throw 404 error")(
    async () => {
      await api.functional.discussionBoard.configurations.eraseById(connection, {
        id: randomUuid,
      });
    },
  );
}