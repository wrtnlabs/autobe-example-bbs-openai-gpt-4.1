import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IPageIDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that non-administrators cannot retrieve discussion board configuration records.
 *
 * Only administrators have access to the configuration list API, which exposes sensitive runtime platform settings.
 * This test ensures that regular members (non-admins) or guests (unauthenticated users) are correctly forbidden
 * from accessing this endpoint, simulating abuse/misuse scenarios and enforcing role-based security compliance.
 *
 * Test Steps:
 * 1. Register a regular (non-admin) discussion board member account.
 * 2. As the regular member (authenticated), attempt to call the PATCH /discussionBoard/configurations API to retrieve configurations.
 * 3. Assert that a 403 Forbidden error (or equivalent) is returned and no configuration data is disclosed.
 *
 * Business rationale: Ensures strict separation of sensitive admin data from non-privileged users, aligns with access control policy, and supports audit, security, and compliance mandates.
 */
export async function test_api_discussionBoard_test_list_configurations_with_invalid_role_forbidden(
  connection: api.IConnection,
) {
  // 1. Register a regular discussion board member.
  const regularMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(regularMember);

  // 2. Attempt to retrieve configurations as non-admin (should be forbidden)
  await TestValidator.error("non-admin cannot access configurations API")(async () => {
    await api.functional.discussionBoard.configurations.patch(connection, {
      body: {}, // empty search/filter (all optional)
    });
  });
}