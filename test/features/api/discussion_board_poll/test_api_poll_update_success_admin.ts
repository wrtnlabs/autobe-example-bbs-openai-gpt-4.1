import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";

/**
 * Test successful admin update of a poll on a given post.
 *
 * Scenario:
 *
 * 1. Register and authenticate as an admin via /auth/admin/join (auto-login on
 *    success).
 * 2. Assume a post and poll already exist (use random UUIDs as placeholders
 *    for postId and pollId).
 * 3. As admin, call /discussionBoard/admin/posts/{postId}/polls/{pollId} with
 *    updated poll content (e.g., new description, updated open/close
 *    time).
 * 4. Assert that returned poll reflects the changes, types are correct, and
 *    business-relevant fields are properly set.
 */
export async function test_api_poll_update_success_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin (join)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Assume already-existing post and poll IDs (use random UUIDs for simulation)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const pollId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update payload: change description, open/close periods, multi_choice flag
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const futureOpen = new Date(Date.now() + 60 * 1000).toISOString(); // opens in 1 minute
  const futureClose = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // closes in 1 hour

  const updatePayload = {
    description: updatedDescription,
    multi_choice: true,
    opened_at: futureOpen,
    closed_at: futureClose,
  } satisfies IDiscussionBoardPoll.IUpdate;

  // 4. Update the poll record as admin
  const updatedPoll =
    await api.functional.discussionBoard.admin.posts.polls.update(connection, {
      postId,
      pollId,
      body: updatePayload,
    });
  typia.assert(updatedPoll);

  // 5. Validate returned poll data reflects the new description and closing time
  TestValidator.equals(
    "poll description updated",
    updatedPoll.description,
    updatedDescription,
  );
  TestValidator.equals(
    "poll multi_choice updated",
    updatedPoll.multi_choice,
    true,
  );
  TestValidator.equals(
    "poll opened_at updated",
    updatedPoll.opened_at,
    futureOpen,
  );
  TestValidator.equals(
    "poll closed_at updated",
    updatedPoll.closed_at,
    futureClose,
  );
}
