import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate that an admin can retrieve the full details of a user's subscription
 * by subscriptionId.
 *
 * This test ensures that, when a board member (as a user) is registered and a
 * subscription is established for a topic or thread, the admin has the
 * privilege to fetch and view all corresponding subscription details. This
 * validates both data integrity and role-based admin read permissions.
 *
 * Step-by-step process:
 *
 * 1. Create a discussion board member (the subscriber).
 * 2. Create a subscription for that member to a random topic or thread with a
 *    notification method.
 * 3. As admin, call the endpoint to fetch subscription details using the
 *    subscriptionId.
 * 4. Assert that all expected fields are present and the properties match the data
 *    used during subscription creation.
 */
export async function test_api_discussionBoard_test_retrieve_subscription_details_as_admin_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member
  const memberCreateBody: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberCreateBody },
  );
  typia.assert(member);

  // 2. Create a subscription for the member
  const subscriptionCreateBody: IDiscussionBoardSubscription.ICreate = {
    subscriber_id: member.id,
    target_type: RandomGenerator.pick(["topic", "thread"]),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: RandomGenerator.pick(["email", "in-app"]),
    is_active: true,
  };
  const subscription =
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  // 3. Retrieve the subscription by its ID (as admin)
  const retrieved = await api.functional.discussionBoard.admin.subscriptions.at(
    connection,
    { subscriptionId: subscription.id },
  );
  typia.assert(retrieved);

  // 4. Assert all returned fields match what was created
  TestValidator.equals("subscriber_id")(retrieved.subscriber_id)(
    subscriptionCreateBody.subscriber_id,
  );
  TestValidator.equals("target_type")(retrieved.target_type)(
    subscriptionCreateBody.target_type,
  );
  TestValidator.equals("target_id")(retrieved.target_id)(
    subscriptionCreateBody.target_id,
  );
  TestValidator.equals("notification_method")(retrieved.notification_method)(
    subscriptionCreateBody.notification_method,
  );
  TestValidator.equals("is_active")(retrieved.is_active)(
    subscriptionCreateBody.is_active,
  );
}
