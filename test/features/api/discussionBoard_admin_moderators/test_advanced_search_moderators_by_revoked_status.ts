import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that advanced search for moderators by grant and revoked date range
 * works correctly.
 *
 * This scenario exercises the admin search API for board moderators,
 * specifically:
 *
 * - Verifies filtering by grant and revoked date windows
 * - Ensures correct distinction between currently active and revoked moderators
 * - Validates search results are paginated and respect the filters
 *
 * Detailed process:
 *
 * 1. Create a currently active moderator by assigning one with granted_at in the
 *    recent past (revoked_at is null)
 * 2. Create a moderator that is revoked (granted_at in further past, revoked_at
 *    also in past)
 * 3. Search for all active moderators (revoked_at is null) and verify only active
 *    moderator is returned
 * 4. Search for moderators revoked in a recent window and verify revoked moderator
 *    is included
 * 5. Search by grant window covering only active moderator and confirm it is
 *    returned
 */
export async function test_api_discussionBoard_admin_moderators_test_advanced_search_moderators_by_revoked_status(
  connection: api.IConnection,
) {
  // 1. Create a currently active moderator
  const grantTimeActive = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // 1 day ago
  const activeModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: `active-user-${typia.random<string>()}`,
        granted_at: grantTimeActive,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(activeModerator);

  // 2. Create a revoked moderator
  const grantTimeRevoked = new Date(
    Date.now() - 7 * 24 * 3600 * 1000,
  ).toISOString(); // 7 days ago
  const revokeTime = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(); // 2 days ago
  const revokedModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: `revoked-user-${typia.random<string>()}`,
        granted_at: grantTimeRevoked,
        revoked_at: revokeTime,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(revokedModerator);

  // 3. Search for all active moderators (revoked_at is null)
  let result = await api.functional.discussionBoard.admin.moderators.search(
    connection,
    {
      body: {
        revoked_at_from: null,
        revoked_at_to: null,
        granted_at_from: null,
        granted_at_to: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardModerator.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate("active moderator included")(
    result.data.some((m) => m.id === activeModerator.id),
  );
  TestValidator.predicate("revoked moderator excluded")(
    result.data.every((m) => m.id !== revokedModerator.id),
  );

  // 4. Search for moderators revoked in last 3 days
  result = await api.functional.discussionBoard.admin.moderators.search(
    connection,
    {
      body: {
        revoked_at_from: new Date(
          Date.now() - 3 * 24 * 3600 * 1000,
        ).toISOString(),
        revoked_at_to: new Date().toISOString(),
        granted_at_from: null,
        granted_at_to: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardModerator.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate("revoked moderator included")(
    result.data.some((m) => m.id === revokedModerator.id),
  );
  TestValidator.predicate("active moderator excluded")(
    result.data.every((m) => m.id !== activeModerator.id),
  );

  // 5. Search by grant window for active moderator
  result = await api.functional.discussionBoard.admin.moderators.search(
    connection,
    {
      body: {
        granted_at_from: new Date(
          Date.now() - 2 * 24 * 3600 * 1000,
        ).toISOString(),
        granted_at_to: new Date().toISOString(),
        revoked_at_from: null,
        revoked_at_to: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardModerator.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate("active moderator included by grant window")(
    result.data.some((m) => m.id === activeModerator.id),
  );
}
