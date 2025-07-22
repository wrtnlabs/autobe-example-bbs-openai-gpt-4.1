import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Test creation of a new discussion board subscription by an authenticated user.
 *
 * This E2E test validates that a registered member can successfully subscribe to a valid content entity (e.g., thread, section, or tag).
 * It checks type and business rules, including uniqueness (no duplicate subscriptions for same member/content) and correct ownership enforcement.
 * The scenario requires the following steps:
 *
 * 1. Register a new member account (acts as authentication context)
 * 2. Create a subscription for a content target with valid target_type and target_id values
 * 3. Validate the response fields match the request's target_type/target_id and the member_id is enforced as the authenticated user
 * 4. Attempt to create a duplicate subscription for the same member and target (should error)
 */
export async function test_api_discussionBoard_test_create_subscription_to_valid_content(connection: api.IConnection) {
  // 1. Register a new member
  const memberReq: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberReq,
  });
  typia.assert(member);
  
  // 2. Use the authenticated context (member_id is inferred by the backend) to subscribe to a content item
  const target_type = "thread";
  const target_id = typia.random<string & tags.Format<"uuid">>();
  const subReq: IDiscussionBoardSubscription.ICreate = {
    target_type,
    target_id,
  };
  const subscription = await api.functional.discussionBoard.subscriptions.post(connection, {
    body: subReq,
  });
  typia.assert(subscription);
  TestValidator.equals("target_type matches")(subscription.target_type)(target_type);
  TestValidator.equals("target_id matches")(subscription.target_id)(target_id);
  TestValidator.equals("member_id matches user")(subscription.member_id)(member.id);

  // 3. Attempt to create a duplicate subscription (should error)
  await TestValidator.error("duplicate subscription")(async () => {
    await api.functional.discussionBoard.subscriptions.post(connection, {
      body: subReq,
    });
  });
}