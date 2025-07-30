import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate that an admin can update a discussion board subscription's
 * notification method or activation status.
 *
 * This test ensures that an existing subscription record can be modified by an
 * admin, and that modifications to fields like delivery (notification) method
 * and is_active status are persisted and visible on read-back. Business
 * purpose: admins must be able to change how notifications are sent or manage
 * subscription states for compliance or user requests.
 *
 * Steps:
 *
 * 1. Create a discussion board member (simulate a newly onboarded user).
 * 2. As admin, create a subscription for that member to a topic/thread.
 * 3. As admin, update the subscription's notification method and is_active status
 *    using the PUT endpoint.
 * 4. Assert that the returned object reflects the updated fields (notification
 *    method and is_active).
 * 5. (Optional) If a get/read method is available, fetch the subscription again to
 *    confirm the changes persist.
 */
export async function test_api_discussionBoard_test_admin_updates_subscription_delivery_method(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. As admin, create a new subscription for that member
  const createSubInput = {
    subscriber_id: member.id,
    target_type: "topic",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: "email",
    is_active: true,
  } satisfies IDiscussionBoardSubscription.ICreate;
  const subscription =
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      {
        body: createSubInput,
      },
    );
  typia.assert(subscription);

  // 3. As admin, update the subscription notification method and is_active status
  const updateInput = {
    notification_method: "in-app",
    is_active: false,
  } satisfies IDiscussionBoardSubscription.IUpdate;
  const updated =
    await api.functional.discussionBoard.admin.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Assert updated fields reflect the intended changes
  TestValidator.equals("notification_method updated")(
    updated.notification_method,
  )("in-app");
  TestValidator.equals("is_active updated")(updated.is_active)(false);

  // 5. (If available) Fetch again to confirm persistence
  // (No direct GET-by-id endpoint for subscriptions in API functions list, so skip this step)
}
