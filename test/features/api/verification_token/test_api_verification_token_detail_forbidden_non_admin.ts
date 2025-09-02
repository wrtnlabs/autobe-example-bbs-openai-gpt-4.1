import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";

/**
 * Verify that fetching verification token details as a non-admin user is
 * forbidden and no sensitive data is leaked.
 *
 * This test ensures that only administrator accounts are allowed to access
 * the admin-only endpoint for viewing verification token details. A normal
 * user is registered and, while authenticated as this user, attempts to
 * retrieve the details of a (random) verification token by UUID using the
 * admin endpoint. The test confirms the access is strictly forbidden, with
 * no sensitive verification token data exposed in the error.
 *
 * Steps:
 *
 * 1. Register a new normal user, providing valid email, unique username,
 *    policy-compliant password, and consent.
 * 2. As this authenticated normal user, attempt a GET request to
 *    /discussionBoard/admin/verificationTokens/{verificationTokenId} using
 *    a random UUID value for the token id.
 * 3. Confirm that the request fails and throws (ideally a 403 Forbidden),
 *    validating that only admins can access this endpoint and that no
 *    information is leaked through the error.
 */
export async function test_api_verification_token_detail_forbidden_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a new non-admin user (normal member)
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "aA!1", // ensure policy compliance
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userInput });
  typia.assert(userAuth);

  // 2. As non-admin user, attempt to access admin-only verification token detail endpoint
  const fakeVerificationTokenId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Non-admin user cannot access admin verification token endpoint",
    async () => {
      await api.functional.discussionBoard.admin.verificationTokens.at(
        connection,
        {
          verificationTokenId: fakeVerificationTokenId,
        },
      );
    },
  );
}
