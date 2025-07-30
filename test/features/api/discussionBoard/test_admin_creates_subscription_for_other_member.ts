import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validates that an admin can create a subscription on behalf of another
 * member.
 *
 * This test checks the business workflow where:
 *
 * 1. An admin registers a new member, who will be the subscriber.
 * 2. The admin then creates a subscription for that member to a topic or thread.
 * 3. The test verifies that the subscription is linked to the correct member
 *    (subscriber_id) and all required fields are populated as expected.
 *
 * This confirms that admins can drive engagement by registering subscriptions
 * for users beyond self-service workflows.
 */
export async function test_api_discussionBoard_test_admin_creates_subscription_for_other_member(
  connection: api.IConnection,
) {
  // 1. Register a new member as admin
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphabets(10),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. As admin, create a subscription for the member
  const targetType = RandomGenerator.pick(["topic", "thread"]);
  const subscriptionInput: IDiscussionBoardSubscription.ICreate = {
    subscriber_id: member.id,
    target_type: targetType,
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: RandomGenerator.pick(["email", "in-app"]),
    is_active: true,
  };
  const subscription =
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      { body: subscriptionInput },
    );
  typia.assert(subscription);

  // 3. Assert subscription record is associated with the right member and fields
  TestValidator.equals("subscriber ID matches")(subscription.subscriber_id)(
    member.id,
  );
  TestValidator.equals("target_type matches")(subscription.target_type)(
    subscriptionInput.target_type,
  );
  TestValidator.equals("target_id matches")(subscription.target_id)(
    subscriptionInput.target_id,
  );
  TestValidator.equals("notification_method matches")(
    subscription.notification_method,
  )(subscriptionInput.notification_method);
  TestValidator.equals("is_active true")(subscription.is_active)(true);
  TestValidator.predicate("subscribed_at is ISO string")(
    !isNaN(Date.parse(subscription.subscribed_at)),
  );
}
