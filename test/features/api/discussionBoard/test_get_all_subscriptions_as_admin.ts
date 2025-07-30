import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Test admin ability to retrieve all discussion board subscriptions with
 * correct pagination and data.
 *
 * Ensures that an admin can:
 *
 * - Retrieve all subscriptions (across different users)
 * - Pagination summary is present and accurate
 * - Subscriptions with various target types, notification methods, and is_active
 *   states are correctly reflected
 * - Created subscriptions are present in the returned data
 *
 * Test steps:
 *
 * 1. Create at least two distinct subscriptions (simulating different users and
 *    settings)
 * 2. Call GET /discussionBoard/admin/subscriptions (default pagination)
 * 3. Assert response includes both test subscriptions and correct fields
 * 4. Assert response includes subscriptions from multiple users and valid
 *    pagination meta
 */
export async function test_api_discussionBoard_admin_subscriptions_index(
  connection: api.IConnection,
) {
  // 1. Create two subscriptions as setup
  const sub1Input: IDiscussionBoardSubscription.ICreate = {
    subscriber_id: typia.random<string & tags.Format<"uuid">>(),
    target_type: "topic",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: "email",
    is_active: true,
  };
  const sub2Input: IDiscussionBoardSubscription.ICreate = {
    subscriber_id: typia.random<string & tags.Format<"uuid">>(),
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    notification_method: "in-app",
    is_active: false,
  };

  const sub1 = await api.functional.discussionBoard.admin.subscriptions.create(
    connection,
    { body: sub1Input },
  );
  typia.assert(sub1);
  const sub2 = await api.functional.discussionBoard.admin.subscriptions.create(
    connection,
    { body: sub2Input },
  );
  typia.assert(sub2);

  // 2. Retrieve paginated subscription summary list
  const page =
    await api.functional.discussionBoard.admin.subscriptions.index(connection);
  typia.assert(page);

  // 3. Assert both created subscriptions are present in the data list
  const ids = page.data.map((x) => x.id);
  TestValidator.predicate("sub1 is present")(ids.includes(sub1.id));
  TestValidator.predicate("sub2 is present")(ids.includes(sub2.id));

  // Confirm the summary fields match what was posted
  const s1 = page.data.find((x) => x.id === sub1.id)!;
  const s2 = page.data.find((x) => x.id === sub2.id)!;

  TestValidator.equals("sub1 subscriber_id")(s1.subscriber_id)(
    sub1.subscriber_id,
  );
  TestValidator.equals("sub2 subscriber_id")(s2.subscriber_id)(
    sub2.subscriber_id,
  );
  TestValidator.equals("sub1 target_type")(s1.target_type)(sub1.target_type);
  TestValidator.equals("sub2 target_type")(s2.target_type)(sub2.target_type);
  TestValidator.equals("sub1 target_id")(s1.target_id)(sub1.target_id);
  TestValidator.equals("sub2 target_id")(s2.target_id)(sub2.target_id);
  TestValidator.equals("sub1 notification_method")(s1.notification_method)(
    sub1.notification_method,
  );
  TestValidator.equals("sub2 notification_method")(s2.notification_method)(
    sub2.notification_method,
  );
  TestValidator.equals("sub1 is_active")(s1.is_active)(sub1.is_active);
  TestValidator.equals("sub2 is_active")(s2.is_active)(sub2.is_active);

  // 4. Pagination assertions
  TestValidator.predicate("at least two records exist")(page.data.length >= 2);
  TestValidator.predicate("multiple subscriber_ids exist")(
    new Set(page.data.map((x) => x.subscriber_id)).size >= 2,
  );
  TestValidator.predicate("pagination meta valid")(
    page.pagination.limit >= page.data.length && page.pagination.current === 1,
  );
}
