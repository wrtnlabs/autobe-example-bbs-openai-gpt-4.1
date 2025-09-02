import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import type { IPageIDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVisitor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardVisitorISummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitorISummary";

/**
 * Validate permission control for listing visitors via discussion board
 * admin API.
 *
 * This test ensures that the PATCH /discussionBoard/admin/visitors endpoint
 * is protected such that only admins can access visitor listing data, and
 * non-admin actors (regular users or unauthenticated clients) are properly
 * denied.
 *
 * 1. Register a standard user (non-admin) via /auth/user/join
 * 2. As a non-admin user, attempt to call PATCH
 *    /discussionBoard/admin/visitors, expecting an authorization/access
 *    control error
 * 3. As an unauthenticated client, attempt to call PATCH
 *    /discussionBoard/admin/visitors (no Authorization header), expecting
 *    similar denial
 *
 * All attempts must confirm that the API does not leak visitor data to
 * unauthorized actors, and error handling is consistent.
 */
export async function test_api_admin_visitor_list_permission_error_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a normal user (non-admin)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = "Password123!";
  const userInput = {
    email: userEmail,
    username: userUsername,
    password: userPassword,
    consent: true,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(user);

  // (A) Attempt as non-admin user (should be denied)
  await TestValidator.error("non-admin user cannot list visitors", async () => {
    await api.functional.discussionBoard.admin.visitors.index(connection, {
      body: {} satisfies IDiscussionBoardVisitor.IRequest,
    });
  });

  // (B) Attempt as unauthenticated client (should also be denied)
  // Remove any auth from the connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated client cannot list visitors",
    async () => {
      await api.functional.discussionBoard.admin.visitors.index(unauthConn, {
        body: {} satisfies IDiscussionBoardVisitor.IRequest,
      });
    },
  );
}
