import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Test that a discussion board member can delete their own subscription, and
 * only the owner (or admin) is authorized to do so.
 *
 * This test covers:
 *
 * 1. Creating a board member (owner) via admin endpoint.
 * 2. Creating a subscription for that member to a topic/thread.
 * 3. Deleting the subscription as the owner (should succeed — hard delete).
 * 4. Attempting to delete the same subscription again (should error).
 * 5. Creating a non-owner member and attempting to delete the owner's subscription
 *    (should be denied).
 *
 * Limitations:
 *
 * - No API provided for fetching or listing single subscriptions after deletion,
 *   so validation is via error and absence of authorized deletion.
 */
export async function test_api_discussionBoard_test_member_delete_own_subscription(
  connection: api.IConnection,
) {
  // 1. Create the owner member via admin
  const ownerUserId = typia.random<string>();
  const owner: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: ownerUserId,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(owner);

  // 2. Create a subscription for the owner
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const subscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: owner.id,
          target_type: "topic",
          target_id: targetId,
          notification_method: "email",
          is_active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 3. Delete the subscription as the owner (should succeed)
  await api.functional.discussionBoard.member.subscriptions.erase(connection, {
    subscriptionId: subscription.id,
  });
  // No output, void return; hard-delete presumed successful if no error

  // 4. Repeat delete — expect error because already deleted
  await TestValidator.error(
    "deleting already-deleted subscription should error",
  )(async () => {
    await api.functional.discussionBoard.member.subscriptions.erase(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  });

  // 5. Create a non-owner member
  const notOwnerUserId = typia.random<string>();
  const notOwner: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: notOwnerUserId,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(notOwner);

  // 6. Create a subscription for non-owner (to make sure their account is valid)
  const otherTargetId = typia.random<string & tags.Format<"uuid">>();
  const nonOwnerSub: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: notOwner.id,
          target_type: "topic",
          target_id: otherTargetId,
          notification_method: "in-app",
          is_active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(nonOwnerSub);

  // 7. Attempt to delete owner's subscription as non-owner — should error
  await TestValidator.error(
    "non-owner should not be able to delete another's subscription",
  )(async () => {
    await api.functional.discussionBoard.member.subscriptions.erase(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  });
}
