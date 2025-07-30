import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Attempt to update a non-existent thread as an admin and verify the correct
 * error is returned.
 *
 * This test ensures that when an admin attempts to update a thread using a
 * threadId that does not exist (random or already deleted), the endpoint
 * returns a not-found error as expected, enforcing integrity of the resource
 * existence checks. This scenario validates error handling for references to
 * non-existent threads when updating details via the admin API.
 *
 * Steps:
 *
 * 1. Register an admin board member (for authentication/context).
 * 2. Create a new discussion topic to use as context (valid topicId is needed by
 *    the endpoint even if threadId is invalid).
 * 3. Attempt to update a thread with a random UUID as threadId that does not
 *    correspond to any existing thread, using a simple title change as body.
 * 4. Confirm that the API responds with a not-found error. Only simple existence
 *    check is validated (no need to check error message text).
 */
export async function test_api_discussionBoard_test_update_thread_fail_nonexistent_thread_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin board member (simulate admin login/registration for context)
  const admin = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: "admin_" + typia.random<string>(),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(admin);

  // 2. Create discussion topic context (ensure valid topicId)
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: "Nonexistent Thread Test Topic",
        pinned: false,
        closed: false,
        description: "Testing update failure for non-existent thread.",
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 3. Attempt to update a non-existent thread with random UUID as threadId
  const fakeThreadId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("update should fail for non-existent thread")(
    async () => {
      await api.functional.discussionBoard.admin.topics.threads.update(
        connection,
        {
          topicId: topic.id,
          threadId: fakeThreadId,
          body: { title: "Updated Title" },
        },
      );
    },
  );
}
