import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * Validate member-level access restrictions for system notices that are either
 * inactive, expired, or not yet active (i.e., scheduling in the future).
 *
 * This test ensures the following:
 *
 * 1. If a system notice is created as inactive (`is_active: false`), or with a
 *    `start_at` (scheduled) in the future, or with an `end_at` already passed
 *    (expired), a regular member should NOT be able to retrieve the notice
 *    detail using the member endpoint.
 * 2. Only system administrators and moderators should be able to fetch such
 *    notices; regular members must receive an error (e.g., 404 or access
 *    denied).
 *
 * Test steps:
 *
 * 1. As an admin, create three types of system notices: a. Inactive notice
 *    (`is_active: false`, no schedule window) b. Future-scheduled notice
 *    (`is_active: true`, `start_at` set to far in the future) c. Expired notice
 *    (`is_active: true`, `end_at` set in the past)
 * 2. As a member, attempt to access each of those system notices individually via
 *    `/discussionBoard/member/systemNotices/{systemNoticeId}` endpoint.
 * 3. Confirm that each request triggers an error, indicating the notice is not
 *    visible to regular members (e.g., not found or access denied).
 *
 * Note: Only functionality feasible through the provided SDK and DTOs is
 * implemented.
 */
export async function test_api_discussionBoard_member_systemNotices_test_retrieve_inactive_or_scheduled_notice_as_member_fails(
  connection: api.IConnection,
) {
  // Step 1a: Admin creates an INACTIVE system notice
  const inactiveNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Inactive notice",
          body: "This notice is not active.",
          is_active: false,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(inactiveNotice);

  // Step 1b: Admin creates a SCHEDULED (future) system notice
  const now = new Date();
  const futureStart = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days in the future
  const futureNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Future notice",
          body: "This notice will be active in future.",
          is_active: true,
          start_at: futureStart,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(futureNotice);

  // Step 1c: Admin creates an EXPIRED notice
  const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
  const expiredNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Expired notice",
          body: "This notice's end_at is in the past.",
          is_active: true,
          end_at: yesterday,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(expiredNotice);

  // Step 2: Try to retrieve each notice as member and expect error
  for (const notice of [
    inactiveNotice,
    futureNotice,
    expiredNotice,
  ] as IDiscussionBoardSystemNotice[]) {
    await TestValidator.error(`Member cannot view notice ${notice.title}`)(
      async () => {
        await api.functional.discussionBoard.member.systemNotices.at(
          connection,
          {
            systemNoticeId: notice.id,
          },
        );
      },
    );
  }
}
