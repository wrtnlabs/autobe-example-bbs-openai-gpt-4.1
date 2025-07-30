import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * Validate that updating a system notice with an invalid scheduling window
 * fails.
 *
 * This test ensures the API rejects schedule updates where start_at > end_at
 * (start after end), returning a validation error when an admin attempts such
 * an update. It also verifies that, on failure, the notice record is NOT
 * modified (as far as the API contract allows; since no "get by ID" API exists,
 * post-check is omitted).
 *
 * Test Outline:
 *
 * 1. Create a valid system notice
 * 2. Attempt to update it with start_at after end_at (invalid window)
 * 3. Assert the update API call throws an error for scheduling logic violation
 *
 * Note: There is no system-notice get-by-id API to verify the notice is
 * unchanged; that part is skipped.
 */
export async function test_api_discussionBoard_admin_systemNotices_test_update_system_notice_with_invalid_schedule(
  connection: api.IConnection,
) {
  // 1. Create a valid system notice
  const originalNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Invalid Update Test - System Notice",
          body: "Schedule logic negative test.",
          is_active: true,
          start_at: null,
          end_at: null,
          category_id: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(originalNotice);

  // 2. Prepare invalid window: start_at after end_at
  const now = new Date();
  const startAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
  const endAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // -1 hour

  // 3. Try the invalid update and expect a validation error
  await TestValidator.error("invalid scheduling window should fail")(() =>
    api.functional.discussionBoard.admin.systemNotices.update(connection, {
      systemNoticeId: originalNotice.id,
      body: {
        title: originalNotice.title,
        body: originalNotice.body,
        is_active: originalNotice.is_active,
        start_at: startAt,
        end_at: endAt,
        category_id: originalNotice.category_id ?? null,
      } satisfies IDiscussionBoardSystemNotice.IUpdate,
    }),
  );
  // 4. No get-by-id API available to verify unchanged state, so post-check is omitted.
}
