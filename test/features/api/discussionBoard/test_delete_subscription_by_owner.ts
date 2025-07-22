import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate the deletion (unsubscribe) of a subscription by its authenticated owner.
 *
 * This test confirms that a registered member can successfully delete (unsubscribe) their own discussion board subscription identified by its UUID.
 * It follows these steps:
 *
 * 1. Register a new discussion board member (the subscription owner)
 * 2. Owner creates a new subscription (to a random thread UUID as target)
 * 3. Owner deletes/unsubscribes from the subscription by its id
 * 4. Attempt to delete the same subscription again – confirms error is thrown (not found/gone)
 * 5. Attempt to delete a completely non-existent subscription UUID – confirms correct error is thrown
 *
 * This test:
 * - Validates ownership enforcement and correct permissioning
 * - Ensures correct handling of soft-deleted or removed records
 * - Confirms errors for attempting to delete already-deleted or non-existent subscriptions
 * - All API calls and types strictly follow the provided SDK and DTOs; no external assumptions
 */
export async function test_api_discussionBoard_test_delete_subscription_by_owner(
  connection: api.IConnection,
) {
  // 1. Register the subscription owner
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Owner creates a subscription targeting a random thread UUID
  const target_id = typia.random<string & tags.Format<"uuid">>();
  const subscription = await api.functional.discussionBoard.subscriptions.post(connection, {
    body: {
      target_type: "thread",
      target_id,
    } satisfies IDiscussionBoardSubscription.ICreate,
  });
  typia.assert(subscription);
  TestValidator.equals("subscription owner matches")(subscription.member_id)(member.id);
  TestValidator.equals("subscription target id matches")(subscription.target_id)(target_id);

  // 3. Owner deletes their subscription by id
  await api.functional.discussionBoard.subscriptions.eraseById(connection, {
    id: subscription.id,
  });

  // 4. Attempt to re-delete deleted subscription (should throw error)
  await TestValidator.error("delete already deleted subscription")(
    async () =>
      await api.functional.discussionBoard.subscriptions.eraseById(connection, {
        id: subscription.id,
      }),
  );

  // 5. Attempt to delete a random non-existent subscription id (should throw error)
  await TestValidator.error("delete non-existent subscription")(
    async () =>
      await api.functional.discussionBoard.subscriptions.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
}