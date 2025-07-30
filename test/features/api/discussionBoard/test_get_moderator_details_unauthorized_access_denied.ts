import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that non-admin users (regular members) are forbidden from viewing
 * moderator details by ID.
 *
 * This test ensures role-based access control by verifying that only admin
 * users can access moderator detail data. It attempts to fetch moderator
 * information using a non-privileged (non-admin) user session, expecting a
 * forbidden error. The moderatorId used can be random, as the key aspect is
 * privilege enforcement, not record existence.
 *
 * Steps:
 *
 * 1. Attempt to fetch moderator details with a random UUID as a regular
 *    (non-admin) user.
 * 2. Validate that the operation fails with an error (forbidden), confirming that
 *    the privilege check is enforced.
 */
export async function test_api_discussionBoard_test_get_moderator_details_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // 1. Attempt to fetch moderator details as a non-admin user.
  const randomModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-admin should be forbidden to get moderator details",
  )(async () => {
    await api.functional.discussionBoard.admin.moderators.at(connection, {
      moderatorId: randomModeratorId,
    });
  });
}
