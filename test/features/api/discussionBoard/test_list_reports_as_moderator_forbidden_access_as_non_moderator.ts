import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test forbidden access to moderator reports endpoint as a non-moderator.
 *
 * This test verifies that non-moderator users (such as regular board members)
 * cannot access the /discussionBoard/moderator/reports endpoint. It ensures
 * that access control mechanisms properly deny non-privileged users and do not
 * expose report data.
 *
 * Steps:
 *
 * 1. Create a regular member account (using the admin API, since user self-signup
 *    is not described).
 * 2. Attempt to access the moderator reports endpoint as a regular member.
 * 3. Expect an error (forbidden/unauthorized) and verify that no report data is
 *    returned.
 */
export async function test_api_discussionBoard_test_list_reports_as_moderator_forbidden_access_as_non_moderator(
  connection: api.IConnection,
) {
  // 1. Create a regular board member via the admin endpoint
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Attempt to access moderator-only reports endpoint as this regular member
  await TestValidator.error("forbidden access for regular member")(async () => {
    await api.functional.discussionBoard.moderator.reports.index(connection);
  });
}
