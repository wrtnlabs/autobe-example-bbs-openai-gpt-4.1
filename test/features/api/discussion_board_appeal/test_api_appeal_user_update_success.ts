import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * E2E: Validate user can update their own appeal post (success scenario).
 *
 * 1. Register and authenticate a user (ensuring unique email/username)
 * 2. Create an appeal for that user, capturing the new appeal's id
 * 3. Update the appeal's narrative (and optionally status)
 * 4. Validate the response: id matches, appellant_id matches, updated fields
 *    are changed
 * 5. Type-check result and assert business logic correctness
 */
export async function test_api_appeal_user_update_success(
  connection: api.IConnection,
) {
  // 1. Register user and establish session
  const uniqueEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const uniqueUsername = RandomGenerator.alphabets(12);
  const joinRes = await api.functional.auth.user.join(connection, {
    body: {
      email: uniqueEmail,
      username: uniqueUsername,
      password: "Aa12345678@",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinRes);
  const userId = joinRes.user.id;

  // 2. User creates an appeal
  const originalReason = RandomGenerator.paragraph({ sentences: 6 });
  const createdAppeal =
    await api.functional.discussionBoard.user.appeals.create(connection, {
      body: {
        appellant_id: userId,
        appeal_reason: originalReason,
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert(createdAppeal);

  // 3. Update the appeal's narrative and status
  const updatedReason = RandomGenerator.paragraph({ sentences: 5 });
  const newStatus = "reviewed"; // Example new status for demonstration
  const updatedAppeal =
    await api.functional.discussionBoard.user.appeals.update(connection, {
      appealId: createdAppeal.id,
      body: {
        appeal_reason: updatedReason,
        status: newStatus,
      } satisfies IDiscussionBoardAppeal.IUpdate,
    });
  typia.assert(updatedAppeal);

  // 4. Validate: id, appellant_id are unchanged, and appeal_reason/status have updated
  TestValidator.equals(
    "appeal ID remains the same",
    updatedAppeal.id,
    createdAppeal.id,
  );
  TestValidator.equals(
    "appellant_id remains the same",
    updatedAppeal.appellant_id,
    userId,
  );
  TestValidator.equals(
    "appeal_reason was updated",
    updatedAppeal.appeal_reason,
    updatedReason,
  );
  TestValidator.equals("status was updated", updatedAppeal.status, newStatus);
  TestValidator.notEquals(
    "appeal_reason changed from original",
    updatedAppeal.appeal_reason,
    originalReason,
  );
}
