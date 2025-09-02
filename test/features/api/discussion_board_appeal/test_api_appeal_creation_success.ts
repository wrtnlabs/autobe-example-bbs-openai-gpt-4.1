import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Test that a verified user can successfully create an appeal.
 *
 * This test covers the complete workflow for a user-initiated appeal:
 *
 * 1. A new user account is registered via POST /auth/user/join providing all
 *    required fields.
 * 2. The session remains authenticated (auto-login after join).
 * 3. The user submits an appeal to POST /discussionBoard/user/appeals,
 *    providing a valid appeal request body referencing their own user id as
 *    appellant_id and a realistic appeal_reason. This request omits
 *    moderation/flag references for a generic case.
 * 4. The response is validated to ensure:
 *
 *    - The returned IDiscussionBoardAppeal contains a unique id (uuid)
 *    - Appellant_id matches the authenticated user
 *    - Status and timestamps fields are present and logical
 *    - Moderation_action_id and flag_report_id are null/undefined
 *    - Appeal_reason matches the submitted payload
 *    - No system or business constraints (e.g., consent, verification, or
 *         suspension) are violated
 */
export async function test_api_appeal_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new user (and auto-login)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "ValidPassw0rd!",
    display_name: RandomGenerator.name(1),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  const userAuth = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(userAuth);
  const user = userAuth.user;
  typia.assert(user);

  // 2. Create an appeal for this user
  const appealInput = {
    appellant_id: user.id,
    appeal_reason: RandomGenerator.paragraph({ sentences: 6 }),
    // generic case: no moderation action/flag references
    moderation_action_id: null,
    flag_report_id: null,
  } satisfies IDiscussionBoardAppeal.ICreate;

  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: appealInput,
    },
  );
  typia.assert(appeal);

  // 3. Response validation
  TestValidator.equals(
    "appeal appellant_id matches user.id",
    appeal.appellant_id,
    user.id,
  );
  TestValidator.predicate(
    "appeal id is uuid",
    typeof appeal.id === "string" && /^[0-9a-fA-F-]{36}$/.test(appeal.id),
  );
  TestValidator.equals(
    "appeal_reason matches payload",
    appeal.appeal_reason,
    appealInput.appeal_reason,
  );
  TestValidator.equals(
    "moderation_action_id is null or undefined",
    appeal.moderation_action_id ?? null,
    null,
  );
  TestValidator.equals(
    "flag_report_id is null or undefined",
    appeal.flag_report_id ?? null,
    null,
  );
  // Status should be set (string, e.g., 'pending')
  TestValidator.predicate(
    "appeal status is present",
    typeof appeal.status === "string" && appeal.status.length > 0,
  );
  // Timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof appeal.created_at === "string" &&
      !isNaN(Date.parse(appeal.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof appeal.updated_at === "string" &&
      !isNaN(Date.parse(appeal.updated_at)),
  );
  // No resolved or deleted time
  TestValidator.equals(
    "resolved_at is null or undefined",
    appeal.resolved_at ?? null,
    null,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    appeal.deleted_at ?? null,
    null,
  );
}
