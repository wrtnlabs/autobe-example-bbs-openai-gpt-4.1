import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate access control when updating a discussion board subscription as a
 * non-owner, non-admin user.
 *
 * This test ensures that only the subscription owner or an admin can update a
 * subscription record.
 *
 * Steps:
 *
 * 1. Create two members (an owner and an attacker) via admin privileges.
 * 2. Create a subscription record with the first member as the owner.
 * 3. Change the acting user to the attacker by setting the 'X-User-Identifier'
 *    header (simulated login/session context).
 * 4. Attempt to update the owner's subscription as the attacker, expecting a
 *    permission denied error.
 */
export async function test_api_discussionBoard_test_update_subscription_with_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Create the legitimate subscription owner
  const memberOwner = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(memberOwner);

  // 1. Create the unrelated (attacker) member
  const memberAttacker =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString(),
      },
    });
  typia.assert(memberAttacker);

  // 2. Create a subscription as the owner
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: memberOwner.id,
          target_type: "topic",
          target_id: targetId,
          notification_method: "email",
          is_active: true,
        },
      },
    );
  typia.assert(subscription);

  // 3. Change acting user context to the attacker
  const attackerConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      "X-User-Identifier": memberAttacker.user_identifier,
    },
  };

  // 4. Attacker attempts to update owner's subscription
  await TestValidator.error(
    "permission denied: attacker should not update another's subscription",
  )(async () => {
    await api.functional.discussionBoard.member.subscriptions.update(
      attackerConnection,
      {
        subscriptionId: subscription.id,
        body: {
          notification_method: "in-app",
          is_active: false,
        },
      },
    );
  });
}
