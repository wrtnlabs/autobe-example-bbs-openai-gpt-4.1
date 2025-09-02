import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";

/**
 * Successfully update a verification token's metadata as an admin.
 *
 * This E2E test verifies that an admin can update key metadata fields of a
 * verification token—such as expiration (expires_at) and usage timestamp
 * (used_at)—through the appropriate admin endpoint, and that all role-based
 * and audit constraints are respected. The test follows a logical business
 * workflow:
 *
 * 1. Register and authenticate as admin via /auth/admin/join.
 * 2. Simulate an existing verification token (since there's no API for
 *    creation in this test context) using typia.random, and ensure its
 *    starting values will differ from what the update will submit.
 * 3. Prepare an update that sets a new, future expires_at and marks the token
 *    as used now.
 * 4. Invoke api.functional.discussionBoard.admin.verificationTokens.update
 *    with the admin context.
 * 5. Validate that mutable fields have changed to match the request, while all
 *    immutable fields and audit trail properties (created_at, id, purpose,
 *    verification_token, and user linkage) remain unchanged. Also ensure
 *    that updated_at reflects the recent mutation.
 */
export async function test_api_verification_token_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin (this sets Authorization)
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Simulate an existing verification token (no API for creation provided)
  //    We'll ensure starting expires_at is not the same as the update's value and used_at is null.
  const baseDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const originalExpiresAt = new Date(baseDate.getTime()).toISOString();
  const originalToken: IDiscussionBoardVerificationToken = {
    ...typia.random<IDiscussionBoardVerificationToken>(),
    expires_at: originalExpiresAt,
    used_at: null,
  };
  typia.assert(originalToken);

  // 3. Prepare a valid update with a new expires_at and used_at
  const newExpiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days in future
  const newUsedAt = new Date().toISOString();
  const updateBody = {
    expires_at: newExpiresAt,
    used_at: newUsedAt,
  } satisfies IDiscussionBoardVerificationToken.IUpdate;

  // 4. Call the update API as admin
  const updatedToken: IDiscussionBoardVerificationToken =
    await api.functional.discussionBoard.admin.verificationTokens.update(
      connection,
      {
        verificationTokenId: originalToken.id,
        body: updateBody,
      },
    );
  typia.assert(updatedToken);

  // 5. Assert that updatable fields are correctly updated
  TestValidator.equals(
    "expires_at should be updated",
    updatedToken.expires_at,
    updateBody.expires_at,
  );
  TestValidator.equals(
    "used_at should be updated",
    updatedToken.used_at,
    updateBody.used_at,
  );

  // 6. Assert immutable/audit fields remain unchanged
  TestValidator.equals(
    "id should not change",
    updatedToken.id,
    originalToken.id,
  );
  TestValidator.equals(
    "user id tied to token should not change",
    updatedToken.discussion_board_user_id,
    originalToken.discussion_board_user_id,
  );
  TestValidator.equals(
    "verification_token string should not change",
    updatedToken.verification_token,
    originalToken.verification_token,
  );
  TestValidator.equals(
    "purpose should not change",
    updatedToken.purpose,
    originalToken.purpose,
  );
  TestValidator.equals(
    "created_at should not change",
    updatedToken.created_at,
    originalToken.created_at,
  );
  // Confirm updated_at has increased (allowing for system lags--should not be before original)
  TestValidator.predicate(
    "updated_at should be newer or equal after update",
    new Date(updatedToken.updated_at).getTime() >=
      new Date(originalToken.updated_at).getTime(),
  );
}
