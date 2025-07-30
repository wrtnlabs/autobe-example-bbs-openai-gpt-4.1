import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validates that the update endpoint for discussion board subscriptions
 * properly rejects invalid payloads.
 *
 * Covers scenarios where (a) an unsupported notification_method value is
 * submitted, and (b) the update payload is empty (no fields supplied). Ensures
 * that schema and business validations are active, and that server does not
 * accept or apply invalid updates.
 *
 * Steps:
 *
 * 1. Register a new discussion board member (via admin API).
 * 2. For this member, create a valid subscription to a topic.
 * 3. Attempt to update the subscription with an invalid notification_method value
 *    (e.g., "sms-pigeon").
 * 4. Attempt to update the subscription with an empty payload (omit all fields).
 * 5. Confirm both cases are rejected with an error, using TestValidator.error for
 *    verification.
 */
export async function test_api_discussionBoard_test_update_subscription_with_invalid_payload(
  connection: api.IConnection,
) {
  // 1. Register a new member via admin endpoint
  const memberInput = {
    user_identifier: RandomGenerator.alphaNumeric(8),
    joined_at: new Date().toISOString(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Create a valid subscription for the new member
  const subscriptionInput = {
    subscriber_id: member.id,
    target_type: "topic",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: "email",
    is_active: true,
  } satisfies IDiscussionBoardSubscription.ICreate;
  const subscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      { body: subscriptionInput },
    );
  typia.assert(subscription);

  // 3. Try to update subscription with unsupported notification_method
  TestValidator.error("unsupported notification_method should cause error")(
    async () => {
      await api.functional.discussionBoard.member.subscriptions.update(
        connection,
        {
          subscriptionId: subscription.id,
          body: {
            notification_method: "sms-pigeon",
          } satisfies IDiscussionBoardSubscription.IUpdate,
        },
      );
    },
  );

  // 4. Try to update subscription with empty payload (no fields)
  TestValidator.error("empty update body should cause error")(async () => {
    await api.functional.discussionBoard.member.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: {} satisfies IDiscussionBoardSubscription.IUpdate,
      },
    );
  });
}
