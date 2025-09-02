import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";

/**
 * Test that a moderator can successfully update an existing poll attached
 * to a discussion board post.
 *
 * This test validates the complete moderator workflow required to edit a
 * poll:
 *
 * 1. Register a new moderator account (auto-login upon join).
 * 2. (Setup) Assume that a post and its poll already exist, and generate
 *    random UUIDs to simulate their identities since creation endpoints for
 *    user/post/poll are not available in current materials.
 * 3. The moderator attempts to update the poll's details (title, closed_at),
 *    using the appropriate API endpoint with updated values.
 * 4. Assert that the poll update is successful by validating the returned
 *    object, and confirm that all modified fields were updated as
 *    requested.
 *
 * Business context:
 *
 * - Moderators have privileges to edit polls on posts unless the post is
 *   locked/archived (not simulated here).
 * - This E2E test is necessary to ensure moderator permissions correctly
 *   propagate to poll updates and that schema/data updates are reflected as
 *   expected.
 */
export async function test_api_poll_update_success_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator and auto-login
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardModerator.IJoin;

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinInput,
    });
  typia.assert(authorizedModerator);

  // 2. Setup: Simulate existing post and poll using random UUIDs (creation endpoints are not available)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const pollId = typia.random<string & tags.Format<"uuid">>();

  // Prepare poll update request (change title and closing date)
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const newClosedAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pollUpdateBody = {
    title: newTitle,
    description: newDescription,
    closed_at: newClosedAt,
  } satisfies IDiscussionBoardPoll.IUpdate;

  // 3. Update the poll as moderator
  const updatedPoll: IDiscussionBoardPoll =
    await api.functional.discussionBoard.moderator.posts.polls.update(
      connection,
      {
        postId,
        pollId,
        body: pollUpdateBody,
      },
    );
  typia.assert(updatedPoll);

  // 4. Validate that all updated fields match request
  TestValidator.equals(
    "poll title should be updated",
    updatedPoll.title,
    newTitle,
  );
  TestValidator.equals(
    "poll description should be updated",
    updatedPoll.description,
    newDescription,
  );
  TestValidator.equals(
    "poll closing date should be updated",
    updatedPoll.closed_at,
    newClosedAt,
  );
  TestValidator.equals(
    "poll id should remain the same as path param",
    updatedPoll.id,
    pollId,
  );
  TestValidator.equals(
    "post id should remain the same as path param",
    updatedPoll.discussion_board_post_id,
    postId,
  );
}
