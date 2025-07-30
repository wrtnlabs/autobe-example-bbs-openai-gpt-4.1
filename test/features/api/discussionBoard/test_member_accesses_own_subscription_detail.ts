import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Test that a member can access their own subscription detail using a valid
 * subscriptionId.
 *
 * Business context: Validates that a registered member, after creating a
 * subscription (to a topic or thread), can retrieve the details of that
 * subscription, and the response reflects all expected fields as created. This
 * ensures privacy and consistency: only a member should be able to view their
 * own subscriptions through this endpoint, and all detail fields should be
 * correct.
 *
 * Step-by-step process:
 *
 * 1. Register a new board member via the admin endpoint (unique user_identifier
 *    and join date).
 * 2. Create a subscription for this member, randomly picking between
 *    "topic"/"thread" targets and a valid target id/type, method, etc.
 * 3. Retrieve the subscription via the member endpoint using the new
 *    subscription's id.
 * 4. Confirm all key fields match the values created (subscriber_id, target_type,
 *    target_id, notification_method, is_active).
 */
export async function test_api_discussionBoard_test_member_accesses_own_subscription_detail(
  connection: api.IConnection,
) {
  // 1. Register a new board member via admin API
  const userIdentifier: string =
    RandomGenerator.alphabets(12) + "@testdomain.com";
  const joinedAt: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a subscription for this member
  const targetType: string = RandomGenerator.pick(["topic", "thread"]);
  const targetId: string = typia.random<string & tags.Format<"uuid">>();
  const notificationMethod: string = RandomGenerator.pick(["email", "in-app"]);
  const subscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: member.id,
          target_type: targetType,
          target_id: targetId,
          notification_method: notificationMethod,
          is_active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 3. Retrieve the subscription detail for the member
  const output = await api.functional.discussionBoard.member.subscriptions.at(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );
  typia.assert(output);

  // 4. Validate all details match
  TestValidator.equals("subscriber_id matches")(output.subscriber_id)(
    member.id,
  );
  TestValidator.equals("target_type matches")(output.target_type)(targetType);
  TestValidator.equals("target_id matches")(output.target_id)(targetId);
  TestValidator.equals("notification_method matches")(
    output.notification_method,
  )(notificationMethod);
  TestValidator.equals("is_active matches")(output.is_active)(true);
}
