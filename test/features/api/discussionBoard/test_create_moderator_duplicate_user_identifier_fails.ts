import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate the uniqueness constraint of moderator assignment in the discussion
 * board.
 *
 * This test ensures that creating a second moderator record for a
 * user_identifier that already has an active moderator assignment fails due to
 * the system's duplicate/uniqueness constraint. This protects the integrity of
 * moderator roles and prevents assigning the same user as an active moderator
 * multiple times.
 *
 * Test process:
 *
 * 1. Create an initial moderator assignment with a unique user_identifier.
 * 2. Attempt to create another moderator assignment using the same user_identifier
 *    while the first assignment is still active.
 * 3. Confirm that the system rejects the second assignment attempt with a
 *    uniqueness violation error (should throw an error), and no duplicate
 *    assignment is created.
 */
export async function test_api_discussionBoard_test_create_moderator_duplicate_user_identifier_fails(
  connection: api.IConnection,
) {
  // 1. Create the initial moderator assignment
  const now = new Date().toISOString();
  const userIdentifier: string = typia.random<string>();
  const initialModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: userIdentifier,
        granted_at: now,
        revoked_at: null,
      },
    });
  typia.assert(initialModerator);
  TestValidator.equals("user_identifier matches")(
    initialModerator.user_identifier,
  )(userIdentifier);
  TestValidator.equals("active moderator")(initialModerator.revoked_at)(null);

  // 2. Attempt duplicate moderator assignment with the same user_identifier (should fail)
  await TestValidator.error(
    "should reject duplicate active moderator assignment",
  )(async () => {
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: userIdentifier,
        granted_at: now,
        revoked_at: null,
      },
    });
  });
}
