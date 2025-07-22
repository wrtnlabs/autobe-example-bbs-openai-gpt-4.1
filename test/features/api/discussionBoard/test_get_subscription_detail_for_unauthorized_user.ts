import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Test unauthorised access to subscription detail.
 *
 * Ensure that a user cannot retrieve the details of a discussion board subscription that belongs to another member, preserving privacy and enforcing security compliance.
 *
 * Steps:
 * 1. Register Member A (the subscription owner) and keep registration info
 * 2. Register Member B (unauthorized user) and keep registration info
 * 3. As Member A, create a subscription
 * 4. Switch (register as) to Member B
 * 5. Attempt to access Member A's subscription as Member B and expect error
 */
export async function test_api_discussionBoard_test_get_subscription_detail_for_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Prepare registration data for Member A
  const memberAReg: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const memberA: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, { body: memberAReg });
  typia.assert(memberA);

  // 2. Prepare registration data for Member B
  const memberBReg: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const memberB: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, { body: memberBReg });
  typia.assert(memberB);

  // 3. Switch to Member A (re-register) and create a subscription
  await api.functional.discussionBoard.members.post(connection, { body: memberAReg });
  const subscription: IDiscussionBoardSubscription = await api.functional.discussionBoard.subscriptions.post(connection, {
    body: {
      target_type: "thread",
      target_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardSubscription.ICreate,
  });
  typia.assert(subscription);

  // 4. Switch to Member B (re-register)
  await api.functional.discussionBoard.members.post(connection, { body: memberBReg });

  // 5. Attempt to fetch subscription owned by Member A (as Member B) and expect forbidden/not found
  await TestValidator.error("unauthorized subscription detail fetch fails")(() =>
    api.functional.discussionBoard.subscriptions.getById(connection, {
      id: subscription.id,
    })
  );
}