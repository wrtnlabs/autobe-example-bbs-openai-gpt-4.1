import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate conflict error when creating a duplicate subscription with the same member, target_type, and target_id.
 *
 * Scenario:
 * 1. Register a new member on the discussion board.
 * 2. The member subscribes to a specific content (target_type + target_id).
 * 3. The same member tries to subscribe to the same content again (same target_type and target_id combination).
 *    This should fail due to a uniqueness constraint on (member_id, target_type, target_id).
 *
 * The test should assert:
 * - The first subscription is created successfully (returns subscription object)
 * - The second subscription attempt fails (returns conflict/duplicate error)
 * - No duplicate subscriptions exist for the same member/target pair
 */
export async function test_api_discussionBoard_test_create_subscription_with_duplicate_subscription(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Subscribe to a thread/section/tag (arbitrary target_id and type)
  const subscriptionPayload: IDiscussionBoardSubscription.ICreate = {
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const firstSubscription = await api.functional.discussionBoard.subscriptions.post(connection, {
    body: subscriptionPayload,
  });
  typia.assert(firstSubscription);

  // 3. Attempt to create the same subscription again (should fail)
  await TestValidator.error("duplicate subscription should fail")(async () => {
    await api.functional.discussionBoard.subscriptions.post(connection, {
      body: subscriptionPayload,
    });
  });
}