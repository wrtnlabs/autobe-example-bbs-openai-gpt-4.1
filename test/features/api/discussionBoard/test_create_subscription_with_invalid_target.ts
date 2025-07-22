import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate error handling when creating a subscription with forbidden, invalid, or non-existent targets.
 *
 * This test ensures that the subscription creation endpoint does not accept invalid target_type or target_id values.
 * Business rules dictate that only existing, non-banned, and supported targets can be subscribed to.
 *
 * Steps:
 * 1. Register a new discussion board member.
 * 2. Attempt to create a subscription with a syntactically valid but non-existent target_id and a supported target_type (e.g., 'thread').
 *    - Should result in an error (400 or 404), and no subscription is created.
 * 3. Attempt to create a subscription with a syntactically valid target_id but an unsupported target_type (e.g., 'unsupported_type').
 *    - Should result in an error (400), and no subscription is created.
 * 4. Attempt to create a subscription with an invalid UUID string as target_id.
 *    - Should result in an error (400), and no subscription is created.
 */
export async function test_api_discussionBoard_test_create_subscription_with_invalid_target(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(24),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberData });
  typia.assert(member);

  // (Note: Authentication simulation via registered member is assumed but not managed by the current API set.)

  // 2. Attempt to create a subscription with non-existent target_id (valid UUID, supported type)
  const invalidTargetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Creating subscription with non-existent target_id should fail")(
    async () => {
      await api.functional.discussionBoard.subscriptions.post(connection, {
        body: {
          target_type: "thread",
          target_id: invalidTargetId,
        },
      });
    },
  );

  // 3. Attempt to create a subscription with an unsupported target_type
  await TestValidator.error("Creating subscription with unsupported target_type should fail")(
    async () => {
      await api.functional.discussionBoard.subscriptions.post(connection, {
        body: {
          target_type: "unsupported_type",
          target_id: invalidTargetId,
        },
      });
    },
  );

  // 4. Attempt to create a subscription with an invalid UUID format for target_id
  await TestValidator.error("Creating subscription with invalid UUID should fail")(
    async () => {
      await api.functional.discussionBoard.subscriptions.post(connection, {
        body: {
          target_type: "thread",
          target_id: "NOT-A-VALID-UUID" as any,
        },
      });
    },
  );
}