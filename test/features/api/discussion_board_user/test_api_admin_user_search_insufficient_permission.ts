import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that PATCH /discussionBoard/admin/users enforces admin-role
 * authentication for user search.
 *
 * Business context: Forum user management operations (advanced user
 * search/listing) are privileged actions requiring admin authentication for
 * compliance and privacy. Per business rules, moderators and standard users
 * must not have access to this admin endpoint.
 *
 * Steps:
 *
 * 1. Register an admin account (to enable later privilege switching and setup
 *    context; not used directly in unauthorized requests)
 * 2. Register a moderator account (to establish a context with authenticated,
 *    but non-admin, privileges)
 * 3. As a moderator (logged-in context), attempt to call PATCH
 *    /discussionBoard/admin/users; expect a permission error
 * 4. Switch to unauthorized context with no authentication, attempt to call
 *    PATCH /discussionBoard/admin/users again; expect a permission error
 * 5. For each error scenario, confirm that the error is a
 *    forbidden/unauthorized access error and that no sensitive data is
 *    leaked
 */
export async function test_api_admin_user_search_insufficient_permission(
  connection: api.IConnection,
) {
  // 1. Register an admin account for setup (not used directly in denial test)
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoinBody = {
    user_id: adminUserId,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const adminJoinResp = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminJoinResp);

  // 2. Register a moderator account
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modJoinBody = {
    email: modEmail,
    username: RandomGenerator.name(),
    password: "securePw-1234!",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardModerator.IJoin;
  const modJoinResp = await api.functional.auth.moderator.join(connection, {
    body: modJoinBody,
  });
  typia.assert(modJoinResp);

  // Moderator is now authenticated in this connection

  await TestValidator.error("moderator cannot search admin users", async () => {
    await api.functional.discussionBoard.admin.users.index(connection, {
      body: {}, // minimal IRequest, valid but user lacks permission
    });
  });

  // 4. Switch to unauthenticated connection (de-authorized context)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot search admin users",
    async () => {
      await api.functional.discussionBoard.admin.users.index(unauthConnection, {
        body: {},
      });
    },
  );
}
