import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Verify that a member can successfully update their own subscription details.
 *
 * This test ensures that a registered discussion board member is able to update
 * the details of a subscription (such as notification method and activation
 * status) that they own. The process will:
 *
 * 1. Register a discussion board member via the admin endpoint.
 * 2. Create a subscription record associated with that member as the subscriber.
 * 3. Update the subscription's notification method and active status using the
 *    subscription owner's context.
 * 4. Verify the response reflects the updated properties and unchanged core
 *    fields.
 */
export async function test_api_discussionBoard_test_update_subscription_with_valid_details_as_owner(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member (admin action)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: typia.random<string>(),
    joined_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: memberInput,
    },
  );
  typia.assert(member);

  // 2. Create a subscription for this member
  const subscriptionInput: IDiscussionBoardSubscription.ICreate = {
    subscriber_id: member.id,
    target_type: "topic",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: "email",
    is_active: true,
  };
  const subscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: subscriptionInput,
      },
    );
  typia.assert(subscription);

  // 3. Update the subscription as the owner (change method & deactivate)
  const updateInput: IDiscussionBoardSubscription.IUpdate = {
    notification_method: "in-app",
    is_active: false,
  };
  const updated =
    await api.functional.discussionBoard.member.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Confirm updated fields & that unchanged fields remain equal
  TestValidator.equals("notification method updated")(
    updated.notification_method,
  )("in-app");
  TestValidator.equals("activation state updated")(updated.is_active)(false);
  TestValidator.equals("subscriber_id unchanged")(updated.subscriber_id)(
    subscription.subscriber_id,
  );
  TestValidator.equals("target_id unchanged")(updated.target_id)(
    subscription.target_id,
  );
}
