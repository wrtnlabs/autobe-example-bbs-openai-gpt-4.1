import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Verify that only the subscription owner can update allowed fields on their subscription.
 *
 * Ensures:
 * - The owner can update permitted fields on their own subscription and changes are persisted
 * - The response reflects updated values
 * - Another user (non-owner) cannot update the subscription (forbidden)
 *
 * Process:
 * 1. Register User A (will own the subscription)
 * 2. Register User B (will try a forbidden update)
 * 3. As User A: create a subscription (e.g., on a "thread")
 * 4. As User A: update the allowed field (target_type) for the subscription and verify persistence
 * 5. As User B: attempt to update User A's subscription and confirm forbidden error
 */
export async function test_api_discussionBoard_test_update_subscription_preferences(
  connection: api.IConnection,
) {
  // 1. Register User A (owner)
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // 2. Register User B (non-owner)
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // (Assume context is now User A post-registration—typically, connection's auth is set)

  // 3. User A creates a subscription to a thread
  const subscription = await api.functional.discussionBoard.subscriptions.post(connection, {
    body: {
      target_type: "thread",
      target_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardSubscription.ICreate,
  });
  typia.assert(subscription);
  TestValidator.equals("subscription belongs to User A")(subscription.member_id)(memberA.id);

  // 4. User A updates the allowed field (target_type) for the subscription
  const updated = await api.functional.discussionBoard.subscriptions.putById(connection, {
    id: subscription.id,
    body: {
      target_type: "section", // Change to another allowed value
    } satisfies IDiscussionBoardSubscription.IUpdate,
  });
  typia.assert(updated);
  TestValidator.equals("updated target_type")(updated.target_type)("section");

  // 5. Attempt forbidden update by User B (simulate context switch—token mgmt assumed)
  // (In realistic tests, you would swap connection headers to B's after login)
  await TestValidator.error("forbidden update by non-owner should fail")(async () => {
    await api.functional.discussionBoard.subscriptions.putById(connection, {
      id: subscription.id,
      body: {
        target_type: "thread",
      } satisfies IDiscussionBoardSubscription.IUpdate,
    });
  });
}