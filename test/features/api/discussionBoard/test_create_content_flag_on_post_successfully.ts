import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test creation of a content flag on an existing post by a moderator
 *
 * Validates that a moderator can create a content flag (such as 'spam' or
 * 'abuse') on a specific discussion board post. The test ensures that required
 * prerequisites are met (post exists, user is a moderator), all API contract
 * rules are observed, and the returned flag record is correctly associated with
 * the target post and includes all necessary attributes for moderation
 * tracking.
 *
 * Workflow:
 *
 * 1. Create a new post as a valid flag target using the post-create endpoint.
 * 2. Assign moderator privileges to a user using the moderator-create endpoint.
 * 3. Acting as a moderator, create a content flag for the post with specified
 *    type, source, and details using the content flag endpoint.
 * 4. Validate the returned flag record for correct association and data integrity.
 *
 * Note: User role switching is presumed by privilege assignment; actual
 * authentication context is not simulated, focusing only on precondition and
 * business contract enforcement as allowed by available SDK and DTOs.
 */
export async function test_api_discussionBoard_test_create_content_flag_on_post_successfully(
  connection: api.IConnection,
) {
  // 1. Create a post under a (random) thread to flag
  const threadId: string = typia.random<string & tags.Format<"uuid">>();
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.threads.posts.create(
      connection,
      {
        threadId,
        body: {
          discussion_board_thread_id: threadId,
          body: RandomGenerator.paragraph()(),
        } satisfies IDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);

  // 2. Assign moderator privileges to a test user (representing the moderator)
  const moderatorIdentifier: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const moderator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorIdentifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Acting as the moderator, create a content flag for the post
  const flagType = RandomGenerator.pick(["spam", "abuse"]);
  const flagSource = "manual";
  const flagDetails = RandomGenerator.paragraph()();
  const flag: IDiscussionBoardContentFlag =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: post.id,
          flag_type: flagType,
          flag_source: flagSource,
          flag_details: flagDetails,
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flag);

  // 4. Validate flag business details
  TestValidator.equals("flag post id")(flag.post_id)(post.id);
  TestValidator.equals("flag type")(flag.flag_type)(flagType);
  TestValidator.equals("flag source")(flag.flag_source)(flagSource);
  TestValidator.equals("flag details")(flag.flag_details)(flagDetails);
}
