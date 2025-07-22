import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Validate that an administrator can successfully retrieve configuration details by UUID.
 *
 * This test checks that after creating a member, granting admin privileges, and inserting a configuration record, the GET configuration by ID endpoint returns all relevant data fields defined by the business contract.
 *
 * Steps:
 * 1. Register a new member with registration info (username, email, hashed_password, display_name, profile_image_url optional)
 * 2. Grant administrator rights to that member
 * 3. As an admin, create a configuration record (key, value, optional description)
 * 4. Call GET /discussionBoard/configurations/{id} with the configuration's id
 * 5. Assert response includes id, key, value, description (if set), created_at, updated_at
 * 6. Assert response fields match what was created
 */
export async function test_api_discussionBoard_test_get_configuration_detail_success_admin(connection: api.IConnection) {
  // 1. Register a new member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: Math.random() < 0.5 ? typia.random<string & tags.Format<"uri">>() : null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberInput });
  typia.assert(member);

  // 2. Grant administrator privileges to the new member
  const admin = await api.functional.discussionBoard.administrators.post(connection, { body: { member_id: member.id } });
  typia.assert(admin);

  // 3. Create a configuration record as administrator
  const configInput: IDiscussionBoardConfiguration.ICreate = {
    key: `auto_test_key_${RandomGenerator.alphaNumeric(6)}`,
    value: RandomGenerator.paragraph()(),
    description: Math.random() < 0.8 ? RandomGenerator.content()()() : null,
  };
  const config = await api.functional.discussionBoard.configurations.post(connection, { body: configInput });
  typia.assert(config);

  // 4. Retrieve configuration detail by UUID
  const retrieved = await api.functional.discussionBoard.configurations.getById(connection, { id: config.id });
  typia.assert(retrieved);

  // 5. Validate fields and audit values
  TestValidator.equals("id matches")(retrieved.id)(config.id);
  TestValidator.equals("key matches")(retrieved.key)(configInput.key);
  TestValidator.equals("value matches")(retrieved.value)(configInput.value);
  TestValidator.equals("description matches")(retrieved.description)(configInput.description ?? null);
  TestValidator.predicate("created_at is ISO string & not empty")(!!retrieved.created_at && typeof retrieved.created_at === "string");
  TestValidator.predicate("updated_at is ISO string & not empty")(!!retrieved.updated_at && typeof retrieved.updated_at === "string");
}