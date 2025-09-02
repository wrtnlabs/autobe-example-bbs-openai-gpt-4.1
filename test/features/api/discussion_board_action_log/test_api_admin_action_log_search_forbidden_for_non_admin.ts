import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActionLog";
import type { IPageIDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActionLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify that non-admin users cannot access the admin action log search
 * endpoint.
 *
 * This test checks two essential business invariants:
 *
 * 1. Moderators (non-admin, even if privileged) are forbidden to search admin
 *    action logs
 * 2. Unauthenticated (public) actors are also forbidden to search admin action
 *    logs
 *
 * Test workflow:
 *
 * - Precondition: initializes at least one admin via /auth/admin/join for
 *   backend requirements (never used for privilege tests)
 * - Creates a unique moderator (via /auth/moderator/join), which logs the
 *   moderator in
 * - Performs a PATCH /discussionBoard/admin/actionLogs as a moderator, with
 *   minimal filters; asserts permission denied
 * - Clears authentication (fresh connection.headers) and attempts the same as
 *   unauthenticated, asserts permission denied
 *
 * Both error assertions are performed using await TestValidator.error with
 * descriptive titles.
 *
 * All request bodies are type-safe and minimal, as the actual permission
 * check does not depend on search filters.
 */
export async function test_api_admin_action_log_search_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // Step 1: Satisfy backend precondition - create an admin for system bootstrapping (do not use admin role after this)
  await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });

  // Step 2: Register and log in moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const modJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(modJoin);

  // Step 3: As moderator, attempt forbidden admin action log query
  await TestValidator.error(
    "moderator forbidden from admin action log index",
    async () => {
      await api.functional.discussionBoard.admin.actionLogs.index(connection, {
        body: {}, // empty/minimal payload
      });
    },
  );

  // Step 4: Perform the same query unauthenticated (no Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated forbidden from admin action log index",
    async () => {
      await api.functional.discussionBoard.admin.actionLogs.index(
        unauthConnection,
        {
          body: {}, // empty/minimal payload
        },
      );
    },
  );
}
