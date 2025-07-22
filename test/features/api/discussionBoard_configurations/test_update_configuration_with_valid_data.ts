import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test that an administrator can successfully update a discussion board configuration.
 *
 * Business scenario: Only admins can modify existing system configurations (key-value settings) for the discussion board, which affects platform functionality and runtime flags. Configuration updates are subject to uniqueness and audit policies.
 *
 * Steps:
 * 1. Create a valid member account (who will become admin).
 * 2. Promote the member to administrator (using their id).
 * 3. With this admin session, create a new configuration key-value pair.
 * 4. Update that configuration (change key, value, and/or description).
 * 5. Assert that the updated configuration record is returned, with updated fields and audit info (updated_at is newer).
 */
export async function test_api_discussionBoard_configurations_test_update_configuration_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a member to become administrator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Promote member to administrator
  const admin: IDiscussionBoardAdministrator = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("administrator assignment")(admin.member_id)(member.id);

  // 3. As admin, create a configuration (simulate admin session by using the same connection)
  const configCreateBody: IDiscussionBoardConfiguration.ICreate = {
    key: `feature_flag_${RandomGenerator.alphaNumeric(6)}`,
    value: JSON.stringify({ enabled: true }),
    description: RandomGenerator.paragraph()(1),
  };
  const createdConfig: IDiscussionBoardConfiguration = await api.functional.discussionBoard.configurations.post(connection, {
    body: configCreateBody,
  });
  typia.assert(createdConfig);
  TestValidator.equals("key matches")(createdConfig.key)(configCreateBody.key);
  TestValidator.equals("value matches")(createdConfig.value)(configCreateBody.value);
  TestValidator.equals("description matches")(createdConfig.description)(configCreateBody.description);

  // 4. Update configuration with new values
  const updateInput: IDiscussionBoardConfiguration.IUpdate = {
    key: `${createdConfig.key}_updated`,
    value: JSON.stringify({ enabled: false }),
    description: RandomGenerator.paragraph()(1),
  };
  const updatedConfig: IDiscussionBoardConfiguration = await api.functional.discussionBoard.configurations.putById(connection, {
    id: createdConfig.id,
    body: updateInput,
  });
  typia.assert(updatedConfig);
  TestValidator.equals("id unchanged")(updatedConfig.id)(createdConfig.id);
  TestValidator.equals("key updated")(updatedConfig.key)(updateInput.key);
  TestValidator.equals("value updated")(updatedConfig.value)(updateInput.value);
  TestValidator.equals("description updated")(updatedConfig.description)(updateInput.description);
  // Audit: updated_at must be newer than created_at
  TestValidator.predicate("audit stamp: updated_at newer than created_at")(new Date(updatedConfig.updated_at) > new Date(updatedConfig.created_at));
}