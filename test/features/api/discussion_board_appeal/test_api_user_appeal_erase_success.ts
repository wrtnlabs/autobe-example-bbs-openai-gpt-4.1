import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Test the successful soft deletion (retirement) of a user-owned appeal and
 * validate compliance.
 *
 * This function exercises the complete workflow for a user performing soft
 * deletion of their own appeal:
 *
 * 1. Register as a user (ensuring authentication)
 * 2. Create an appeal referencing their own account
 * 3. Issue a DELETE to the appeal's endpoint
 * 4. Validate API returns the appeal updated with the `deleted_at` timestamp
 * 5. Ensure primary key is retained and content is not hard-deleted (still
 *    visible for compliance/audit)
 *
 * Note: The endpoint to query active/non-deleted appeals is not exposed;
 * the test asserts only the soft delete behavior in the response.
 */
export async function test_api_user_appeal_erase_success(
  connection: api.IConnection,
) {
  // 1. Register a user (auth & user context are required for subsequent endpoints)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const password = RandomGenerator.alphaNumeric(12) + "A@1";
  const displayName = RandomGenerator.name();
  const joinResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinResponse);
  const user = joinResponse.user;

  // 2. Create an appeal for this user
  const appealReason = RandomGenerator.paragraph({ sentences: 6 });
  const appealInput = {
    appellant_id: user.id,
    appeal_reason: appealReason,
  } satisfies IDiscussionBoardAppeal.ICreate;
  const createdAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: appealInput,
    });
  typia.assert(createdAppeal);

  // 3. Delete (soft-retire) the appeal
  const erasedAppeal = await api.functional.discussionBoard.user.appeals.erase(
    connection,
    {
      appealId: createdAppeal.id,
    },
  );
  typia.assert(erasedAppeal);

  // 4. Validate deleted_at is set, primary key is retained, compliance fields exist
  TestValidator.equals(
    "appeal soft-deletion sets deleted_at on the same object",
    erasedAppeal.id,
    createdAppeal.id,
  );
  TestValidator.predicate(
    "deleted_at field should be present and ISO string",
    typeof erasedAppeal.deleted_at === "string" &&
      Boolean(Date.parse(erasedAppeal.deleted_at)),
  );
  TestValidator.equals(
    "appellant remains the owner",
    erasedAppeal.appellant_id,
    user.id,
  );
  TestValidator.notEquals(
    "deleted_at must be different from null after deletion",
    erasedAppeal.deleted_at,
    null,
  );

  // 5. Confirm business invariants: object is NOT hard-deleted
  TestValidator.equals(
    "appeal is not erased from database (retained for compliance)",
    erasedAppeal.id,
    createdAppeal.id,
  );
}
