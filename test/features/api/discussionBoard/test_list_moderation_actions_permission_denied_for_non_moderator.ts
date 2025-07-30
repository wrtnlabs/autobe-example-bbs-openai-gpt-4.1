import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate that non-moderator users (e.g., guests or regular members) cannot
 * list moderation actions.
 *
 * This test attempts to access the moderation actions listing endpoint without
 * moderator or admin privileges. It verifies that the user receives a
 * permission denied error rather than a valid moderation action list.
 *
 * Steps:
 *
 * 1. As a non-authenticated user or a standard member, attempt to call the
 *    moderation actions index endpoint.
 * 2. Expect an error indicating insufficient permissions (authorization failure).
 * 3. Ensure that no moderation action data is returned on failure (i.e., cannot
 *    bypass permissions enforcement).
 */
export async function test_api_discussionBoard_test_list_moderation_actions_permission_denied_for_non_moderator(
  connection: api.IConnection,
) {
  // Attempt to fetch moderation actions list without moderator/admin privileges
  await TestValidator.error("permission denied for non-moderator")(async () => {
    await api.functional.discussionBoard.moderator.moderationActions.index(
      connection,
    );
  });
}
