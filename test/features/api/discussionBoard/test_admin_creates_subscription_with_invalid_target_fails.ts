import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate that admin cannot create a subscription to a non-existent target
 * (topic or thread)
 *
 * This test ensures that when the admin tries to create a subscription
 * specifying a topic or thread ID that does not exist, the operation fails as
 * expected and does not silently succeed. The endpoint must enforce referential
 * integrity and not allow subscriptions to invalid or unregistered discussion
 * targets.
 *
 * Step-by-step process:
 *
 * 1. Register a new discussion board member (admin-side) as the subscriber.
 * 2. Attempt to create a subscription for that member with a completely random
 *    (invalid or non-existent) target_id value (make sure it doesn't exist),
 *    for both 'topic' and 'thread' cases.
 * 3. In both cases, ensure the endpoint responds with a validation or referential
 *    integrity error, not a success, and does not return a valid created
 *    object.
 */
export async function test_api_discussionBoard_test_admin_creates_subscription_with_invalid_target_fails(
  connection: api.IConnection,
) {
  // 1. Register a new member who will be the subscriber
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(10),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Attempt to create a subscription with a non-existent topic target
  const invalidTopicId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should not allow subscription to invalid topic id",
  )(async () => {
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: member.id,
          target_type: "topic",
          target_id: invalidTopicId,
          notification_method: "in-app",
          is_active: true,
        },
      },
    );
  });

  // 3. Attempt to create a subscription with a non-existent thread target
  const invalidThreadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should not allow subscription to invalid thread id",
  )(async () => {
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: member.id,
          target_type: "thread",
          target_id: invalidThreadId,
          notification_method: "in-app",
          is_active: true,
        },
      },
    );
  });
}
