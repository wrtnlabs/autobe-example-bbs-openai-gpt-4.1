import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate that a registered member can create a subscription to a topic or
 * thread.
 *
 * - Registers a new discussion board member (using admin endpoint, as required)
 * - Member subscribes themselves to a target (topic or thread) using member
 *   subscription endpoint
 * - Confirms that the created subscription references the correct member id,
 *   target, and notification method
 * - Ensures all response fields are as expected, and business rules (such as
 *   linking subscription to self) are enforced
 */
export async function test_api_discussionBoard_member_subscriptions_test_member_creates_own_subscription(
  connection: api.IConnection,
) {
  // 1. Register a new board member (admin action)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Member subscribes to a topic or thread (simulate with random target)
  const target_type = RandomGenerator.pick(["topic", "thread"]);
  const target_id = typia.random<string & tags.Format<"uuid">>();
  const notification_method = RandomGenerator.pick(["email", "in-app"]);
  const subscriptionInput: IDiscussionBoardSubscription.ICreate = {
    subscriber_id: member.id,
    target_type,
    target_id,
    notification_method,
    is_active: true,
  };
  const subscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      { body: subscriptionInput },
    );
  typia.assert(subscription);

  // 3. Validate subscription details
  TestValidator.equals("subscriber_id matches")(subscription.subscriber_id)(
    member.id,
  );
  TestValidator.equals("target_type matches")(subscription.target_type)(
    target_type,
  );
  TestValidator.equals("target_id matches")(subscription.target_id)(target_id);
  TestValidator.equals("notification_method matches")(
    subscription.notification_method,
  )(notification_method);
  TestValidator.equals("is_active is true")(subscription.is_active)(true);
}
