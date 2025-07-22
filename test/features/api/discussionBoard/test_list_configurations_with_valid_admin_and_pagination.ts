import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IPageIDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Validate that an administrator can successfully retrieve a paginated, filtered list of discussion board configuration records.
 *
 * Business context:
 * Only authenticated administrators should be able to access the list of configuration key-value pairs. This test ensures that the endpoint supports filter and pagination parameters, restricts access appropriately, and returns correct metadata for compliance and audit trail.
 *
 * Steps:
 * 1. Register a new discussion board member (who will be promoted to administrator).
 * 2. Assign administrator role to the new member.
 * 3. Call PATCH /discussionBoard/configurations with a valid filter and pagination request (e.g., limit = 1, page = 1).
 * 4. Validate that the response is a paginated result list (IPageIDiscussionBoardConfiguration) with correct pagination fields, and all items contain required fields including created_at and updated_at.
 */
export async function test_api_discussionBoard_test_list_configurations_with_valid_admin_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a discussion board member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const member: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(16), // Simulating pre-hashed password
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Assign administrator privilege to the member
  const admin: IDiscussionBoardAdministrator = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Retrieve the paginated configuration list as the admin
  const page = 1;
  const limit = 1;
  // Filters can be set as desired; here we use null to get unfiltered results
  const configPage = await api.functional.discussionBoard.configurations.patch(connection, {
    body: {
      page,
      limit,
      key: null,
      value: null,
      description: null,
    } satisfies IDiscussionBoardConfiguration.IRequest,
  });
  typia.assert(configPage);

  // Validate pagination metadata
  TestValidator.predicate("pagination present")(!!configPage.pagination);
  TestValidator.predicate("data is array")(Array.isArray(configPage.data));
  TestValidator.equals("limit matches")(configPage.pagination.limit)(limit);
  TestValidator.equals("current page matches")(configPage.pagination.current)(page);

  // Validate each configuration record has required metadata fields
  for (const config of configPage.data) {
    TestValidator.predicate('id present')(!!config.id);
    TestValidator.predicate('key present')(!!config.key);
    TestValidator.predicate('value present')(!!config.value);
    TestValidator.predicate('created_at present')(!!config.created_at);
    TestValidator.predicate('updated_at present')(!!config.updated_at);
  }
}