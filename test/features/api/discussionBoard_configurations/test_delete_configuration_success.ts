import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test successful soft deletion of a discussion board configuration by an administrator.
 *
 * Validates that an administrator can soft-delete a configuration using the eraseById endpoint.
 * Note: IDiscussionBoardConfiguration does not provide a 'deleted_at' field, so we cannot explicitly check soft-deletion status beyond API response type validation.
 *
 * Steps:
 * 1. Register a member account to be used as the administrator.
 * 2. Grant administrator privileges to this member.
 * 3. Create a new configuration entry as admin.
 * 4. Delete the configuration using eraseById; validate the API response matches IDiscussionBoardConfiguration.
 * 5. (Omitted) Cannot validate audit or deletion state due to lack of deleted_at field in DTO.
 */
export async function test_api_discussionBoard_configurations_test_delete_configuration_success(
  connection: api.IConnection,
) {
  // 1. Register a member for admin use
  const adminMemberInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const adminMember = await api.functional.discussionBoard.members.post(connection, {
    body: adminMemberInput,
  });
  typia.assert(adminMember);

  // 2. Assign admin privileges
  const adminAssignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: adminMember.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(adminAssignment);

  // 3. Create a configuration as admin
  const configInput = {
    key: `test_config_key_${RandomGenerator.alphaNumeric(6)}`,
    value: JSON.stringify({ flag: true }),
    description: "Test config for soft delete.",
  } satisfies IDiscussionBoardConfiguration.ICreate;
  const configuration = await api.functional.discussionBoard.configurations.post(connection, {
    body: configInput,
  });
  typia.assert(configuration);

  // 4. Soft-delete the configuration
  const deletedConfig = await api.functional.discussionBoard.configurations.eraseById(connection, {
    id: configuration.id,
  });
  typia.assert(deletedConfig);
  // No further assertions possible for 'deleted_at' property as it does not exist in IDiscussionBoardConfiguration.
}