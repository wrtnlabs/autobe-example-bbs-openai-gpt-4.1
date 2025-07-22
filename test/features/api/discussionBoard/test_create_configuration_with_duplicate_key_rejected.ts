import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test that creating a configuration with a duplicate key is rejected.
 *
 * This test verifies the configuration key uniqueness constraint in the system's admin features. A new administrator is set up, then a configuration is created with a unique key. The test then attempts to create another configuration using the same key. The system is expected to reject this second creation attempt, enforcing uniqueness, and return a conflict or error.
 *
 * Process:
 * 1. Register a new member for the discussion board system
 * 2. Assign the newly created member as an administrator
 * 3. Create a configuration with a unique key (admin-only operation)
 * 4. Attempt to create another configuration with the same key
 * 5. Confirm that the API rejects the second creation attempt due to key uniqueness violation
 */
export async function test_api_discussionBoard_test_create_configuration_with_duplicate_key_rejected(
  connection: api.IConnection,
) {
  // 1. Register new member (admin candidate)
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member);

  // 2. Assign administrator role
  const admin = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: member.id },
  });
  typia.assert(admin);

  // 3. Create configuration with a unique key
  const configKey = RandomGenerator.alphabets(15);
  const configCreateBody = {
    key: configKey,
    value: "true",
    description: "Enable some feature",
  } satisfies IDiscussionBoardConfiguration.ICreate;
  const config = await api.functional.discussionBoard.configurations.post(connection, {
    body: configCreateBody,
  });
  typia.assert(config);

  // 4. Attempt to create another configuration with the same key
  await TestValidator.error("Duplicate configuration key should be rejected")(
    () => api.functional.discussionBoard.configurations.post(connection, {
      body: {
        key: configKey,
        value: "false",
        description: "Another config with duplicate key",
      },
    })
  );
}