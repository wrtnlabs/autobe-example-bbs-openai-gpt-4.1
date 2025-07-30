import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate error handling when updating a nonexistent subscription as admin.
 *
 * Business context: This test ensures that the system does not silently succeed
 * or incorrectly update records when given an invalid/nonexistent
 * subscriptionId. Instead, the system should return an error (such as 404 Not
 * Found or another appropriate error response) and maintain data integrity.
 *
 * Step-by-step process:
 *
 * 1. Generate a random (non-existent) UUID to use as subscriptionId for the
 *    update.
 * 2. Prepare a valid update payload for a subscription (including only editable
 *    fields).
 * 3. Attempt to perform the update on the admin endpoint with the nonexistent
 *    subscriptionId.
 * 4. Validate that the API responds with an error, and that no subscription is
 *    incorrectly created or altered as a side effect.
 */
export async function test_api_discussionBoard_admin_subscriptions_test_admin_update_nonexistent_subscription_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a clearly non-existent subscription UUID
  const nonexistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid subscription update payload
  const updateBody: IDiscussionBoardSubscription.IUpdate = {
    notification_method: "email",
    is_active: false,
    target_type: "topic",
    target_id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 3. Attempt the update; expect an error (e.g., not found)
  await TestValidator.error(
    "Should error: updating nonexistent subscription as admin",
  )(async () => {
    await api.functional.discussionBoard.admin.subscriptions.update(
      connection,
      {
        subscriptionId: nonexistentSubscriptionId,
        body: updateBody,
      },
    );
  });
}
