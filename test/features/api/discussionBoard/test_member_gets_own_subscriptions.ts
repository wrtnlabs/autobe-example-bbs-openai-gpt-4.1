import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate that a discussion board member retrieves only their own
 * subscriptions.
 *
 * This test ensures that when a regular member lists their subscriptions via
 * GET /discussionBoard/member/subscriptions, only subscriptions actually owned
 * by that member are included in the results—even if an admin has created
 * unrelated subscriptions for other users. This prevents information leakage or
 * privilege abuse. The workflow covers positive and negative scenarios:
 *
 * 1. Simulate two members (MemberA, MemberB) via UUID generation.
 * 2. MemberA creates a subscription using POST
 *    /discussionBoard/member/subscriptions.
 * 3. Admin creates a subscription for MemberB using POST
 *    /discussionBoard/admin/subscriptions.
 * 4. MemberA calls GET /discussionBoard/member/subscriptions.
 * 5. Confirm only MemberA's subscription appears in the result (not MemberB's), by
 *    checking subscriber_id and checking that MemberB's subscription is
 *    absent.
 */
export async function test_api_discussionBoard_test_member_gets_own_subscriptions(
  connection: api.IConnection,
) {
  // 1. Simulate two members by generating UUIDs
  const memberA_id = typia.random<string & tags.Format<"uuid">>();
  const memberB_id = typia.random<string & tags.Format<"uuid">>();

  // 2. MemberA creates their own subscription
  const subA = await api.functional.discussionBoard.member.subscriptions.create(
    connection,
    {
      body: {
        subscriber_id: memberA_id,
        target_type: "topic",
        target_id: typia.random<string & tags.Format<"uuid">>(),
        notification_method: "email",
        is_active: true,
      } satisfies IDiscussionBoardSubscription.ICreate,
    },
  );
  typia.assert(subA);

  // 3. Admin creates a subscription for MemberB
  const subB = await api.functional.discussionBoard.admin.subscriptions.create(
    connection,
    {
      body: {
        subscriber_id: memberB_id,
        target_type: "thread",
        target_id: typia.random<string & tags.Format<"uuid">>(),
        notification_method: "in-app",
        is_active: true,
      } satisfies IDiscussionBoardSubscription.ICreate,
    },
  );
  typia.assert(subB);

  // 4. MemberA lists their subscriptions
  const page =
    await api.functional.discussionBoard.member.subscriptions.index(connection);
  typia.assert(page);

  // 5. Validate that all returned subscriptions are owned by MemberA
  for (const summary of page.data)
    TestValidator.equals("subscription is for current member")(
      summary.subscriber_id,
    )(memberA_id);

  // Also, ensure that MemberB's subscription is not present
  TestValidator.predicate("should not include other member's subscription")(
    !page.data.some((s) => s.id === subB.id),
  );

  // Additional: There should be at least one result for MemberA
  TestValidator.predicate("has at least one subscription for memberA")(
    page.data.length > 0,
  );
}
