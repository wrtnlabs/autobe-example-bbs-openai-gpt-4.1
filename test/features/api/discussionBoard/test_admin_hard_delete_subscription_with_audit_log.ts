import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validates that an admin can permanently delete (hard delete) a user's
 * discussion board subscription by its unique ID.
 *
 * This test ensures:
 *
 * - Subscriptions are actually removed and cannot be retrieved post-deletion (no
 *   soft delete semantics)
 * - Required admin permissions are respected
 * - Audit requirements can be supported externally (not directly checked here)
 *
 * Workflow:
 *
 * 1. Create a new member (representing the user to have a subscription).
 * 2. Create a new board subscription as an admin, using the new member as
 *    subscriber.
 * 3. Hard-delete (erase) the subscription by its ID using the admin API.
 * 4. Try to delete it again (should not find resource).
 * 5. (Optional: If listing/retrieval existed, verify subscription absence).
 *
 * Note: No direct subscription GET/listing endpoint is present in available API
 * functions for final validation—hard delete implies absence.
 */
export async function test_api_discussionBoard_test_admin_hard_delete_subscription_with_audit_log(
  connection: api.IConnection,
) {
  // 1. Create a member (the subscriber)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphabets(12),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Create a subscription
  const subscriptionInput: IDiscussionBoardSubscription.ICreate = {
    subscriber_id: member.id,
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: "in-app",
    is_active: true,
  };
  const subscription =
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      { body: subscriptionInput },
    );
  typia.assert(subscription);

  // 3. Erase the subscription by ID as admin
  await api.functional.discussionBoard.admin.subscriptions.erase(connection, {
    subscriptionId: subscription.id,
  });

  // 4. Trying to erase it again should cause an error (since already deleted)
  await TestValidator.error("Second deletion should fail")(() =>
    api.functional.discussionBoard.admin.subscriptions.erase(connection, {
      subscriptionId: subscription.id,
    }),
  );

  // 5. (No GET/list available: no further validation possible here)
}
