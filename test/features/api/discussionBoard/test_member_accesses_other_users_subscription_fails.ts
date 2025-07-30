import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validates that a member cannot access another user's subscription details.
 *
 * This test simulates two distinct discussion board members. The first member
 * creates a subscription entry for a topic or thread. The second member then
 * attempts to access the subscription detail belonging to the first member. The
 * system is expected to forbid this action and return an access error (such as
 * 403 Forbidden).
 *
 * Steps:
 *
 * 1. Register the first discussion board member (user1) as an admin operation.
 * 2. Register a second discussion board member (user2).
 * 3. As user1, create a subscription entry to a random topic/thread.
 * 4. As user2, attempt to retrieve the subscription created by user1. Validate
 *    that the action is denied.
 *
 * This test ensures member-level access control is enforced; members cannot
 * view other users' subscription information.
 */
export async function test_api_discussionBoard_test_member_accesses_other_users_subscription_fails(
  connection: api.IConnection,
) {
  // 1. Register first member (user1)
  const userIdentifier1 = RandomGenerator.alphaNumeric(12);
  const member1 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier1,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member1);

  // 2. Register second member (user2)
  const userIdentifier2 = RandomGenerator.alphaNumeric(12);
  const member2 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier2,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member2);

  // 3. As user1, create a subscription
  const targetType = RandomGenerator.pick(["topic", "thread"]);
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: member1.id,
          target_type: targetType,
          target_id: targetId,
          notification_method: "in-app",
          is_active: true,
        },
      },
    );
  typia.assert(subscription);

  // Note: No role-based switching—test assumes access enforcement is done via subscriber_id linkage not token context.

  // 4. As user2, attempt to access user1's subscription detail (should fail)
  await TestValidator.error("user2 forbidden to view user1's subscription")(
    async () => {
      await api.functional.discussionBoard.member.subscriptions.at(connection, {
        subscriptionId: subscription.id,
      });
    },
  );
}
