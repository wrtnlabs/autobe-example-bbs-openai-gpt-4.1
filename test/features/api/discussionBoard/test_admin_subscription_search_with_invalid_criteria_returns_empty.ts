import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that searching for discussion board subscriptions with invalid filter
 * criteria returns an empty result without throwing an error (for various
 * filter types).
 *
 * Business rationale: Admins must be able to filter subscriptions and see an
 * empty result (not an error) if no matches are found. Verifies that the API
 * gracefully handles no-result scenarios for a variety of filter criteria as
 * might occur in dashboard or analytics use.
 *
 * Steps:
 *
 * 1. Search with a non-existent subscriber_id (UUID not tied to any subscriber)
 * 2. Confirm output is successful and data array is empty.
 * 3. Search with a non-existent target_id (thread/topic not present).
 * 4. Confirm output is successful and data array is empty.
 * 5. Search with a notification_method string that does not exist anywhere in the
 *    data.
 * 6. Confirm output is successful and data array is empty.
 */
export async function test_api_discussionBoard_test_admin_subscription_search_with_invalid_criteria_returns_empty(
  connection: api.IConnection,
) {
  // 1. Search with a subscriber_id that does not exist
  const outputBySubscriber =
    await api.functional.discussionBoard.admin.subscriptions.search(
      connection,
      {
        body: {
          subscriber_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(outputBySubscriber);
  TestValidator.equals("empty result for invalid subscriber")(
    outputBySubscriber.data.length,
  )(0);

  // 2. Search with a target_id that does not exist
  const outputByTarget =
    await api.functional.discussionBoard.admin.subscriptions.search(
      connection,
      {
        body: {
          target_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(outputByTarget);
  TestValidator.equals("empty result for invalid target")(
    outputByTarget.data.length,
  )(0);

  // 3. Search with a notification_method that is certainly not present
  const outputByNotification =
    await api.functional.discussionBoard.admin.subscriptions.search(
      connection,
      {
        body: {
          notification_method: "definitely-nonexistent-method-xyz",
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(outputByNotification);
  TestValidator.equals("empty result for invalid notification_method")(
    outputByNotification.data.length,
  )(0);
}
