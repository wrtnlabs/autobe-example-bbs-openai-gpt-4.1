import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";
import type { IPageIDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that non-admin or unauthenticated users are denied access to the
 * password reset audit API.
 *
 * This test attempts to search the PATCH
 * /discussionBoard/admin/passwordResets endpoint with no authentication
 * context (connection without access token). The expectation is that the
 * server returns an error, typically a 401 Unauthorized or 403 Forbidden,
 * thereby enforcing access control for admin-only audit endpoints.
 *
 * Steps:
 *
 * 1. Compose a sample request body that satisfies
 *    IDiscussionBoardPasswordReset.IRequest (can be minimal, as the request
 *    itself should be blocked).
 * 2. Create an unauthorized connection by omitting any Authorization header
 *    (either not present or an empty object).
 * 3. Attempt to call api.functional.discussionBoard.admin.passwordResets.index
 *    with the unauthorized connection.
 * 4. Assert that the call throws a runtime error using TestValidator.error,
 *    confirming denial of access.
 */
export async function test_api_admin_password_reset_search_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Compose a minimal, valid request body
  const requestBody: IDiscussionBoardPasswordReset.IRequest = {};

  // Step 2: Simulate an unauthorized connection by using an empty headers object.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt the request and expect an error
  await TestValidator.error(
    "should deny access to password reset token audit for unauthenticated user",
    async () => {
      await api.functional.discussionBoard.admin.passwordResets.index(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );
}
