import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * E2E: Success case for admin updating a password reset event’s mutable
 * fields via the admin API.
 *
 * Business Context: Platform administrators must be able to mark password
 * reset requests as 'used' (setting used_at) or extend expiry (expires_at),
 * while all other password reset fields remain immutable. This ensures
 * auditability and compliance, only allowing privileged mutation. The
 * scenario shows end-to-end that (a) admin authentication is required, (b)
 * partial and full updates work, (c) immutability of certain fields is
 * enforced.
 *
 * Steps:
 *
 * 1. Register (join) as a privileged admin (admin join endpoint). This ensures
 *    the connection context is correctly set up for an admin.
 * 2. Prepare a password reset record – create a mock/stub (random) password
 *    reset entity, as we assume a legitimate resource exists beforehand
 *    (since creation is not in scope here).
 * 3. Update the password reset (PUT) using the admin API, setting the
 *    'used_at' timestamp to simulate marking it as used; verify response
 *    fields: a. changed used_at matches what was sent b. all other
 *    immutable fields remain as before
 * 4. Then, update again, this time only the 'expires_at' field to a new future
 *    date; verify that only expires_at is mutated.
 * 5. After each, typia.assert the updated resource; use TestValidator.equals
 *    for field-level validation.
 * 6. (Out of scope: error path testing and business setup/teardown.)
 */
export async function test_api_password_reset_update_success_admin(
  connection: api.IConnection,
) {
  // 1. Register/join as admin (auto-login)
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Prepare a "mock" existing password reset entity
  const origPasswordReset: IDiscussionBoardPasswordReset =
    typia.random<IDiscussionBoardPasswordReset>();

  // 3. Update: PATCH used_at to a new timestamp
  const newUsedAt: string = new Date().toISOString();
  const updated: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.admin.passwordResets.update(
      connection,
      {
        passwordResetId: origPasswordReset.id,
        body: {
          used_at: newUsedAt,
        } satisfies IDiscussionBoardPasswordReset.IUpdate,
      },
    );
  typia.assert(updated);

  TestValidator.equals("used_at correctly updated", updated.used_at, newUsedAt);
  TestValidator.equals(
    "expires_at unchanged",
    updated.expires_at,
    origPasswordReset.expires_at,
  );
  TestValidator.equals(
    "immutable id field unchanged",
    updated.id,
    origPasswordReset.id,
  );
  TestValidator.equals(
    "reset_token unchanged",
    updated.reset_token,
    origPasswordReset.reset_token,
  );
  TestValidator.equals(
    "user association unchanged",
    updated.discussion_board_user_id,
    origPasswordReset.discussion_board_user_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    origPasswordReset.created_at,
  );

  // 4. Partial update: only expires_at
  const newExpiresAt: string = new Date(
    Date.now() + 14 * 24 * 3600 * 1000,
  ).toISOString();
  const again: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.admin.passwordResets.update(
      connection,
      {
        passwordResetId: origPasswordReset.id,
        body: {
          expires_at: newExpiresAt,
        } satisfies IDiscussionBoardPasswordReset.IUpdate,
      },
    );
  typia.assert(again);

  TestValidator.equals("expires_at updated", again.expires_at, newExpiresAt);
  TestValidator.equals(
    "used_at unchanged after second update",
    again.used_at,
    updated.used_at,
  );
  TestValidator.equals("id unchanged", again.id, origPasswordReset.id);
  TestValidator.equals(
    "reset_token unchanged after second update",
    again.reset_token,
    origPasswordReset.reset_token,
  );
  TestValidator.equals(
    "user association unchanged after second update",
    again.discussion_board_user_id,
    origPasswordReset.discussion_board_user_id,
  );
  TestValidator.equals(
    "created_at unchanged after second update",
    again.created_at,
    origPasswordReset.created_at,
  );
}
