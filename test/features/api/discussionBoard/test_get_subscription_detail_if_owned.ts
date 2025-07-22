import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Test successfully retrieving the detail for a specific subscription by its UUID for the authenticated owner.
 *
 * Business context:
 * - Only the owner of the subscription should be able to retrieve its details.
 * - All metadata of the subscription must be correct and consistent with creation inputs.
 * - Deleted (or soft-deleted) subscriptions should not be retrievable and must result in an error (e.g., not found/gone).
 *
 * Test Steps:
 * 1. Register a new member account (owner).
 * 2. Create a new subscription for this member to a random target (with fake UUID/type).
 * 3. Call GET /discussionBoard/subscriptions/{id} using the correct subscription id for the same (authenticated) user.
 * 4. Assert all metadata matches—ownership, target information, and timestamps.
 * 5. (Negative) Attempt to call GET with a deliberately invalid UUID and expect error (not found).
 * 6. (Negative) Simulate or perform delete/soft-delete for the subscription (if deletion supported), then try to GET again and assert proper error (not found/gone).
 *    - If no delete API is available, skip this negative step.
 */
export async function test_api_discussionBoard_test_get_subscription_detail_if_owned(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Create a new subscription for the member
  const subscriptionInput: IDiscussionBoardSubscription.ICreate = {
    target_type: RandomGenerator.pick(["thread", "section", "tag"]),
    target_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const subscription = await api.functional.discussionBoard.subscriptions.post(connection, {
    body: subscriptionInput,
  });
  typia.assert(subscription);

  // 3. Retrieve the subscription detail by id as the owner
  const output = await api.functional.discussionBoard.subscriptions.getById(connection, {
    id: subscription.id,
  });
  typia.assert(output);

  // 4. Assert returned data matches created subscription
  TestValidator.equals("subscription.id")(output.id)(subscription.id);
  TestValidator.equals("member_id")(output.member_id)(member.id);
  TestValidator.equals("target_type")(output.target_type)(subscriptionInput.target_type);
  TestValidator.equals("target_id")(output.target_id)(subscriptionInput.target_id);
  TestValidator.equals("created_at")(output.created_at)(subscription.created_at);

  // 5. Negative test: Try retrieving with a non-existent UUID, expect error
  await TestValidator.error("Not found for non-existent id")(() =>
    api.functional.discussionBoard.subscriptions.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    })
  );

  // 6. Negative test (if possible): Try retrieving after deletion - skip as no delete API exposed.
}