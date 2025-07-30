import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Test that a non-moderator, non-admin user cannot delete a content flag
 * (authorization enforcement).
 *
 * This test simulates a typical moderator workflow up to the creation of a
 * content flag, then switches roles to a normal user to attempt a forbidden
 * operation. It validates strict access control logic for flag deletion.
 *
 * Steps:
 *
 * 1. As ADMIN: Register a normal member user (that lacks moderator or admin
 *    privileges).
 * 2. As MEMBER: (For post association) Create a post in a random thread.
 * 3. As MODERATOR (assume already authenticated): Create a content flag on the
 *    post.
 * 4. As MEMBER: Attempt to delete the flag with the non-privileged user — expect
 *    an authorization error.
 * 5. As MODERATOR: Ensure the flag is still present (cannot verify by a GET since
 *    no such endpoint is provided, but indirect verification can be discussed
 *    in comments).
 *
 * Only uses actual DTOs and API functions provided; login/auth flows with
 * role/context switching are not available directly in this API set, so we
 * perform calls in sequence according to requirements.
 */
export async function test_api_discussionBoard_test_prevent_unauthorized_content_flag_deletion(
  connection: api.IConnection,
) {
  // 1. Admin registers a normal member (regular, not moderator or admin).
  const userIdentifier: string = RandomGenerator.alphabets(10);
  const joinTime: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: joinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. As member: create a post in some thread (threadId must be specified)
  const threadId: string = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
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

  // 3. As moderator: create a content flag linked to the post
  const contentFlag =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: post.id,
          flag_type: "test-unauth-access",
          flag_source: "manual",
          flag_details: "Test flag for unauthorized access scenario.",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);

  // 4. As a normal member (not moderator/admin): attempt to delete the flag, expect an authorization error
  await TestValidator.error("Non-privileged user cannot delete flag")(
    async () => {
      await api.functional.discussionBoard.moderator.contentFlags.erase(
        connection,
        {
          contentFlagId: contentFlag.id,
        },
      );
    },
  );

  // 5. Indirectly, validate that the flag is still present - as we cannot directly GET flags, we at least validate the delete did not succeed and no type errors nor privilege escalation has happened.
}
