import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test creation of a new system configuration record as an administrator.
 *
 * Business context:
 * System-wide configuration settings for the discussion board are only creatable by administrators. This test validates that a properly authenticated admin
 * can create a configuration record with a unique key/value/description,
 * and that the created record contains the expected audit metadata fields.
 *
 * Test process:
 * 1. Create a new member account for use as the admin.
 * 2. Assign administrator privileges to that member.
 * 3. Create a new configuration record with unique valid key/value/description as admin.
 * 4. Validate that the returned record matches input and includes correct metadata fields.
 *
 * Note: Only SDK functions and types provided are used; since no index/detail endpoints are exposed, full retrieval is not validated beyond the creation response.
 */
export async function test_api_discussionBoard_test_create_configuration_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board member
  const memberReq: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(15),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberReq,
  });
  typia.assert(member);

  // 2. Grant administrator privileges to the member
  const admin = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin member id")(admin.member_id)(member.id);

  // 3. Create a unique configuration as admin
  const configReq: IDiscussionBoardConfiguration.ICreate = {
    key: `test_flag_${RandomGenerator.alphabets(8)}_${Date.now()}`,
    value: JSON.stringify({ enabled: true }),
    description: "Test configuration setting created by E2E test.",
  };
  const config = await api.functional.discussionBoard.configurations.post(connection, {
    body: configReq,
  });
  typia.assert(config);
  TestValidator.equals("configuration key")(config.key)(configReq.key);
  TestValidator.equals("configuration value")(config.value)(configReq.value);
  TestValidator.equals("configuration description")(config.description)(configReq.description);
  TestValidator.predicate("created_at is valid ISO date")(
    !isNaN(Date.parse(config.created_at)),
  );
  TestValidator.predicate("updated_at is valid ISO date")(
    !isNaN(Date.parse(config.updated_at)),
  );
  TestValidator.predicate("config id is uuid")(
    typeof config.id === "string" &&
    /^[0-9a-fA-F-]{36}$/.test(config.id),
  );
}