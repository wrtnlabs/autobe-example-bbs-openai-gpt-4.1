import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import type { IPageIDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that unauthorized and unauthenticated users cannot list votes.
 *
 * Only admins and moderators may access the vote list/search endpoint for compliance and audit. Ordinary members, guests, and unauthenticated users are forbidden from accessing this resource. This test verifies that insufficient privilege enforcement is working. No pre-existing data or special setup is needed because permission is checked before data retrieval.
 *
 * Steps:
 * 1. Attempt to call the /discussionBoard/votes endpoint with an unauthenticated client (no auth headers), expecting a permission error (403 Forbidden or equivalent).
 */
export async function test_api_discussionBoard_test_list_votes_access_denied_for_unauthorized_users(
  connection: api.IConnection,
) {
  // 1. Attempt as guest/unauthenticated (no authentication headers)
  await TestValidator.error("unauthenticated client - should be rejected")(
    async () => {
      await api.functional.discussionBoard.votes.patch(connection, {
        body: {} satisfies IDiscussionBoardVote.IRequest,
      });
    },
  );
}