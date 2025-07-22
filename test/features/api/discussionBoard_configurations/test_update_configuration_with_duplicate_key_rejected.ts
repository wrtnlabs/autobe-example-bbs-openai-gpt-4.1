import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test updating a configuration's key to an existing key should be rejected.
 *
 * This test ensures the system enforces unique keys for discussion board configurations.
 *
 * Process:
 * 1. Create an admin member
 * 2. Assign admin privileges to the member
 * 3. Using this administrator, create the first configuration with a unique key (key1)
 * 4. Create a second configuration with another unique key (key2)
 * 5. Attempt to update the second configuration so that its key matches the first configuration's key (key1)
 * 6. Validate that the update fails due to uniqueness constraint (conflict or error thrown)
 *
 * SUCCESS: The update is rejected as expected.
 */
export async function test_api_discussionBoard_configurations_test_update_configuration_with_duplicate_key_rejected(
  connection: api.IConnection,
) {
  // 1. Create an admin member
  const adminMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(adminMember);

  // 2. Assign admin privileges to the member
  const adminAssignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: adminMember.id } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(adminAssignment);

  // 3. Create the first configuration (key1)
  const key1 = "test_unique_key_" + RandomGenerator.alphaNumeric(6);
  const config1 = await api.functional.discussionBoard.configurations.post(connection, {
    body: {
      key: key1,
      value: "value1",
      description: "First configuration for uniqueness test",
    } satisfies IDiscussionBoardConfiguration.ICreate,
  });
  typia.assert(config1);

  // 4. Create the second configuration (key2)
  const key2 = "test_unique_key_" + RandomGenerator.alphaNumeric(6);
  const config2 = await api.functional.discussionBoard.configurations.post(connection, {
    body: {
      key: key2,
      value: "value2",
      description: "Second configuration for uniqueness test",
    } satisfies IDiscussionBoardConfiguration.ICreate,
  });
  typia.assert(config2);

  // 5. Attempt to update second configuration's key to key1 (duplicate)
  await TestValidator.error("update should fail due to duplicate key")(
    async () => {
      await api.functional.discussionBoard.configurations.putById(connection, {
        id: config2.id,
        body: {
          key: key1, // duplicate key to trigger unique constraint
          value: "new value for key1",
          description: "Trying to duplicate existing key",
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      });
    }
  );
}