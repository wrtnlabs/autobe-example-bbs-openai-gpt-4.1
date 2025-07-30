import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate unique constraint on member subscriptions by preventing duplicate
 * subscriptions.
 *
 * This test ensures a discussion board member cannot subscribe to the same
 * topic or thread more than once. The system must enforce this unique
 * constraint and block the duplicate.
 *
 * Steps:
 *
 * 1. Register a new discussion board member using the admin endpoint.
 * 2. Choose a target entity (topic or thread) to subscribe to. Generate valid UUID
 *    for this purpose.
 * 3. As the member, subscribe to the target topic/thread with a specific
 *    notification method (e.g., 'email').
 * 4. Attempt to subscribe again to the same topic/thread with identical parameters
 *    for subscriber, type, and target.
 * 5. Validate that the second attempt fails (e.g., with a 409 or business error)
 *    due to unique constraint enforcement.
 */
export async function test_api_discussionBoard_test_member_subscription_creation_with_duplicate_target_fails(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const user_identifier = RandomGenerator.alphaNumeric(20); // unique business ID
  const joined_at = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Choose subscription target entity (topic/thread)
  const target_type = RandomGenerator.pick(["topic", "thread"]);
  const target_id = typia.random<string & tags.Format<"uuid">>();

  // 3. First subscription attempt (should succeed)
  const sub_body = {
    subscriber_id: member.id,
    target_type,
    target_id,
    notification_method: "email",
    is_active: true,
  } satisfies IDiscussionBoardSubscription.ICreate;
  const subscription1 =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: sub_body,
      },
    );
  typia.assert(subscription1);

  // 4. Second subscription attempt (duplicate - should fail)
  await TestValidator.error("duplicate subscription should fail")(async () => {
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: sub_body,
      },
    );
  });
}
