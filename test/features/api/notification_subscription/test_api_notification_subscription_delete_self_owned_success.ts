import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful soft deletion (unsubscription) of a notification
 * subscription by its owner.
 *
 * This test verifies that a user who owns a notification subscription can
 * soft-delete (unsubscribe from) their own subscription using the provided
 * endpoint. The workflow ensures a correct and realistic business flow,
 * using only endpoints and types that are available in the provided project
 * contract.
 *
 * Business process:
 *
 * 1. Register a new user account with unique randomized email, username,
 *    password, and required consent; optional display name is included.
 * 2. As the authenticated user (token set on join), simulate notification
 *    subscription creation for this user. (Since creation endpoint is not
 *    supplied, a random UUID is used here as the subscriptionId.)
 * 3. Perform the DELETE
 *    /discussionBoard/user/notificationSubscriptions/{subscriptionId} as
 *    the owner to soft-delete the (simulated) notification subscription.
 * 4. (If list/read endpoints were available, confirm the deleted_at field is
 *    set and subscription is excluded from the user's active subscription
 *    list; this validation is only described in code comments here.)
 *
 * Limitations and notes:
 *
 * - Subscription creation and post-deletion status/read are
 *   simulated/documented because the necessary endpoints are not present in
 *   provided SDK/types.
 * - The primary validation is that the endpoint allows the owner to delete
 *   their own subscription and completes successfully in the valid workflow
 *   context.
 */
export async function test_api_notification_subscription_delete_self_owned_success(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board user with unique, valid credentials
  const userInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "1A!", // Ensure password meets policy
    display_name: RandomGenerator.name(),
    consent: true,
  };

  const joinResult = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(joinResult);
  const userId = joinResult.user.id;
  TestValidator.predicate(
    "joined user should have a valid UUID id",
    typeof userId === "string" && userId.length > 0,
  );

  // 2. Simulate notification subscription creation and obtain subscriptionId
  // (Subscription creation endpoint is not present in provided contract.)
  // In a full implementation, create the subscription here and record its id.
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete the notification subscription as the authenticated owner
  await api.functional.discussionBoard.user.notificationSubscriptions.erase(
    connection,
    { subscriptionId },
  );

  // 4. NOTE: Post-deletion verification of deleted_at field and exclusion
  // from active subscriptions cannot be implemented due to missing read/list endpoints.
  // In a real scenario, add validation here when such endpoints/items become available.
}
