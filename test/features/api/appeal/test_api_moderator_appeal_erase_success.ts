import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Verify that a moderator can soft-delete (retire) a user appeal via the
 * moderator endpoint (DELETE
 * /discussionBoard/moderator/appeals/{appealId}).
 *
 * 1. Register a user with unique credentials, consenting to policies.
 * 2. As that user, submit (create) a new appeal with realistic narrative text.
 * 3. Register a moderator account with unique credentials and consent, then
 *    authenticate as that moderator.
 * 4. (Role switching) Use the moderator account to DELETE the user appeal
 *    using the moderator endpoint.
 * 5. Validate that the returned appeal object is soft-deleted:
 *
 *    - The response includes a non-null 'deleted_at' ISO8601 date-time string.
 *    - The appeal 'id', 'appellant_id', and provided appeal fields are
 *         preserved.
 *    - Status and compliance/audit context are intact for review.
 *    - The deletion is audit-safe rather than physically removed ('deleted_at'
 *         is set, not a physical delete).
 *    - All relevant relationships and business properties are consistent.
 */
export async function test_api_moderator_appeal_erase_success(
  connection: api.IConnection,
) {
  // 1. User registration with unique email, username, compliance consent, strong password
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12) + "Aa!";
  const userUsername = RandomGenerator.alphabets(8);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // 2. User creates an appeal
  const appealReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 6,
    wordMax: 12,
  });
  const createdAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: {
        appellant_id: userJoin.user.id,
        appeal_reason: appealReason,
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert(createdAppeal);

  // 3. Register and login as moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = RandomGenerator.alphaNumeric(14) + "Ab!";
  const modUsername = RandomGenerator.alphabets(7);
  const modJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      username: modUsername,
      password: modPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(modJoin);
  // Login as moderator (renew authentication context for role)
  const modLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(modLogin);

  // 4. Moderator deletes (retires) the appeal
  const erased = await api.functional.discussionBoard.moderator.appeals.erase(
    connection,
    {
      appealId: createdAppeal.id,
    },
  );
  typia.assert(erased);

  // 5. Validate soft-delete and audit/compliance
  TestValidator.equals(
    "deleted_at is set (soft-delete)",
    typeof erased.deleted_at,
    "string",
  );
  // ISO string parse check
  TestValidator.predicate(
    "deleted_at is valid ISO date",
    !isNaN(Date.parse(erased.deleted_at ?? "")),
  );
  TestValidator.equals("preserved id", erased.id, createdAppeal.id);
  TestValidator.equals(
    "preserved appellant_id",
    erased.appellant_id,
    createdAppeal.appellant_id,
  );
  TestValidator.equals(
    "appeal reason preserved",
    erased.appeal_reason,
    createdAppeal.appeal_reason,
  );
  TestValidator.equals(
    "compliance/audit context intact",
    erased.status,
    createdAppeal.status,
  );
  TestValidator.notEquals(
    "not physically deleted (object remains)",
    erased,
    null,
  );
}
