import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that a regular member cannot access another user's subscriptions by
 * supplying a different user's UUID as the `subscriber_id` in the PATCH request
 * to /discussionBoard/member/subscriptions.
 *
 * The system must enforce that regular members can only query their own
 * subscriptions:
 *
 * - Searching for another member's subscriptions as a regular user (by specifying
 *   their UUID) should be forbidden (error thrown), or must not return any
 *   out-of-scope data (backend may choose error or just empty results).
 * - Searching with your own UUID should succeed and return only your
 *   subscriptions.
 *
 * **Process:**
 *
 * 1. Admin creates a subscription for a 'victim' user so there is a record to test
 *    against.
 * 2. As a regular member (the attacker), attempt to search for victim's
 *    subscriptions using victim's UUID.
 * 3. Confirm that either an error is thrown (forbidden), or no unauthorized data
 *    is revealed.
 * 4. Additionally, as the member, attempt to search your own subscriptions and
 *    confirm results only belong to self.
 *
 * **Assumption:** The `connection` parameter is authenticated as a regular
 * member (attacker), NOT as admin or victim. If authentication/role switching
 * is required, ensure proper steps precede these actions using actual
 * authentication APIs.
 */
export async function test_api_discussionBoard_test_forbidden_when_member_searches_other_users_subscriptions(
  connection: api.IConnection,
) {
  // 1. Setup: Admin creates a subscription for the victim user (so that there is data to attempt to access)
  const victimUserId: string = typia.random<string & tags.Format<"uuid">>();
  const topicId: string = typia.random<string & tags.Format<"uuid">>();

  const created: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.admin.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: victimUserId,
          target_type: "topic",
          target_id: topicId,
          notification_method: "in-app",
          is_active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("subscription belongs to victim")(created.subscriber_id)(
    victimUserId,
  );

  // 2. As a regular member, attempt to search subscriptions for another user (should not be allowed)
  TestValidator.error(
    "regular member cannot list another user's subscriptions",
  )(async () => {
    await api.functional.discussionBoard.member.subscriptions.search(
      connection,
      {
        body: {
          subscriber_id: victimUserId,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  });

  // 3. Additionally, search with your own user id (should be allowed; results, if any, must be owned by self)
  // In real setups, attackerUserId would be derived from authenticated member's profile.
  // For this e2e, just assign a random but realistic id (in real-case, fetch actual user id of connection).
  const attackerUserId: string = typia.random<string & tags.Format<"uuid">>();
  const selfSearch =
    await api.functional.discussionBoard.member.subscriptions.search(
      connection,
      {
        body: {
          subscriber_id: attackerUserId,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(selfSearch);
  // 4. Validate all subscriptions (if any) are owned by the requester/attacker
  TestValidator.predicate("subscribed records are only owned by self")(
    selfSearch.data.every((x) => x.subscriber_id === attackerUserId),
  );
}
