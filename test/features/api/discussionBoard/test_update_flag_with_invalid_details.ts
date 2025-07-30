import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validates API error handling for moderator attempts to update a content flag
 * with invalid data.
 *
 * This test ensures that the
 * /discussionBoard/moderator/contentFlags/{contentFlagId} endpoint correctly
 * rejects updates from a moderator when the update payload is invalid, such as
 * providing an unrecognized flag type, omitting required fields, or supplying
 * malformed UUIDs. It is critical that the API enforces proper input validation
 * and business logic, protecting data integrity and reliable moderation
 * workflow.
 *
 * Test process:
 *
 * 1. Create a post (to serve as a flag target). This requires a thread id.
 * 2. Create a user and assign them as a moderator (simulating admin privilege).
 * 3. Create an initial content flag for the post as the moderator.
 * 4. Attempt to update the content flag as a moderator using deliberately invalid
 *    input— including an unrecognized flag_type, missing required fields, and
 *    invalid post_id format.
 * 5. Assert that the API responds with validation or business logic errors in each
 *    negative case.
 *
 * Negative test edge cases covered:
 *
 * - Omitting a required field (flag_type)
 * - Setting flag_type to an unrecognized value
 * - Supplying an invalid UUID format for post_id
 *
 * All responses for setup APIs are asserted for schema correctness. All
 * negative update attempts are wrapped in TestValidator.error to ensure proper
 * rejection. The structure and flow adhere to E2E testing best practices,
 * covering prerequisite setup and negative validation.
 */
export async function test_api_discussionBoard_test_update_flag_with_invalid_details(
  connection: api.IConnection,
) {
  // 1. Create a post under a spontaneously generated thread
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(post);

  // 2. Authorize a moderator user
  const moderatorUserIdentifier = typia.random<string>();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 3. Create an initial content flag for the post
  const flag =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: post.id,
          flag_type: "spam",
          flag_source: "manual",
          flagged_by_moderator_id: moderator.id,
          flag_details: "Initial flag for negative test.",
        },
      },
    );
  typia.assert(flag);

  // 4. Attempt invalid update scenarios

  // (a) Omitting required field (flag_type); schema expects at least one valid update field
  await TestValidator.error(
    "Missing required field (flag_type) triggers validation error",
  )(async () => {
    await api.functional.discussionBoard.moderator.contentFlags.update(
      connection,
      {
        contentFlagId: flag.id,
        body: {
          // Intentionally empty update; should be rejected by API validation logic.
        } as any, // Workaround: Typescript would normally block this; in practice, such an update is invalid.
      },
    );
  });

  // (b) Setting flag_type to an unrecognized value
  await TestValidator.error("Invalid flag_type is rejected by business logic")(
    async () => {
      await api.functional.discussionBoard.moderator.contentFlags.update(
        connection,
        {
          contentFlagId: flag.id,
          body: {
            flag_type: "not_a_valid_type",
          },
        },
      );
    },
  );

  // (c) Supplying an invalid UUID format for post_id
  await TestValidator.error(
    "Invalid UUID for post_id triggers validation error",
  )(async () => {
    await api.functional.discussionBoard.moderator.contentFlags.update(
      connection,
      {
        contentFlagId: flag.id,
        body: {
          post_id: "invalid-uuid-format",
        },
      },
    );
  });
}
