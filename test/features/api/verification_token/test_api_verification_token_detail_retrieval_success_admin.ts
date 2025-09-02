import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";

/**
 * Test successful retrieval of a single verification token's administrative
 * details as an admin.
 *
 * This test covers both the success path and failure (not-found) scenarios
 * for the admin verification token detail API.
 *
 * Steps:
 *
 * 1. Admin is registered and authenticated via /auth/admin/join.
 * 2. A synthetic verification token is generated (since no creation endpoint
 *    exists) using typia.random.
 * 3. Admin requests token details using the correct token ID.
 * 4. Audit and status fields are validated for presence and correct typing,
 *    including nullable fields.
 * 5. Sensitive token value is only verified to exist as a non-empty string per
 *    admin-level response, not for content.
 * 6. Attempts retrieval with a random, likely-nonexistent ID to confirm error
 *    handling.
 */
export async function test_api_verification_token_detail_retrieval_success_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Synthesize a verification token object (since no creation endpoint exists)
  const verificationToken = typia.random<IDiscussionBoardVerificationToken>();
  typia.assert(verificationToken);

  // 3. Retrieve token details as admin
  const tokenDetail =
    await api.functional.discussionBoard.admin.verificationTokens.at(
      connection,
      {
        verificationTokenId: verificationToken.id,
      },
    );
  typia.assert(tokenDetail);

  // 4. Validate critical audit/status fields and formats
  TestValidator.predicate(
    "token id is valid uuid",
    typeof tokenDetail.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(tokenDetail.id),
  );
  TestValidator.predicate(
    "user association is valid uuid",
    typeof tokenDetail.discussion_board_user_id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(tokenDetail.discussion_board_user_id),
  );
  TestValidator.predicate(
    "purpose is present",
    typeof tokenDetail.purpose === "string" && tokenDetail.purpose.length > 0,
  );
  TestValidator.predicate(
    "expires_at is ISO8601",
    typeof tokenDetail.expires_at === "string" &&
      !isNaN(Date.parse(tokenDetail.expires_at)),
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof tokenDetail.created_at === "string" &&
      !isNaN(Date.parse(tokenDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    typeof tokenDetail.updated_at === "string" &&
      !isNaN(Date.parse(tokenDetail.updated_at)),
  );
  TestValidator.predicate(
    "verification_token is non-empty string",
    typeof tokenDetail.verification_token === "string" &&
      tokenDetail.verification_token.length > 0,
  );
  if (tokenDetail.used_at !== null && tokenDetail.used_at !== undefined)
    TestValidator.predicate(
      "used_at is ISO8601 if present",
      typeof tokenDetail.used_at === "string" &&
        !isNaN(Date.parse(tokenDetail.used_at)),
    );
  if (tokenDetail.deleted_at !== null && tokenDetail.deleted_at !== undefined)
    TestValidator.predicate(
      "deleted_at is ISO8601 if present",
      typeof tokenDetail.deleted_at === "string" &&
        !isNaN(Date.parse(tokenDetail.deleted_at)),
    );

  // 5. Attempt retrieval with a random, likely-nonexistent ID to ensure error is thrown
  await TestValidator.error(
    "admin fetch with non-existent verificationTokenId fails",
    async () => {
      await api.functional.discussionBoard.admin.verificationTokens.at(
        connection,
        {
          verificationTokenId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
