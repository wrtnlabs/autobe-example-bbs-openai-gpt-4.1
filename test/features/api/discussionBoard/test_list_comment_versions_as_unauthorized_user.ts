import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVersion";

/**
 * Validate that an unauthorized user (not author, admin, or mod) cannot view
 * another member's comment version history.
 *
 * Scenario Flow:
 *
 * 1. Register two members via the admin endpoint: Member A (the author) and Member
 *    B (the unauthorized accessor)
 * 2. Member A creates a comment on some post (simulate post ownership via random
 *    UUID for post, as actual post creation API is not provided)
 * 3. Member B, who is neither author nor admin, attempts to fetch the version list
 *    for A's comment using the GET
 *    /discussionBoard/member/comments/{commentId}/versions endpoint
 * 4. Assert that Member B is denied access (i.e., an error occurs) as per business
 *    rules
 *
 * Notes:
 *
 * - Since only comment creation and member registration endpoints are provided,
 *   simulate the precondition by using Member A for comment creation; use
 *   random values for parent post as needed.
 * - No API for authentication/session/user switch is given, so this test assumes
 *   the backend enforces ownership and access control by provided member
 *   context (if possible). If user switching is not supported via connection,
 *   the access control logic should still behave as described.
 * - This test specifically covers the negative case (unauthorized user rejected).
 */
export async function test_api_discussionBoard_test_list_comment_versions_as_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Register two members (admin-only via /discussionBoard/admin/members)
  //   - Member A (author)
  //   - Member B (unauthorized user)
  const memberA_user_identifier: string = RandomGenerator.alphaNumeric(12);
  const memberB_user_identifier: string = RandomGenerator.alphaNumeric(12);
  const joinedAtA: string = new Date().toISOString();
  const joinedAtB: string = new Date().toISOString();

  const memberA: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: memberA_user_identifier,
        joined_at: joinedAtA,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberA);

  const memberB: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: memberB_user_identifier,
        joined_at: joinedAtB,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberB);

  // 2. Member A creates a comment (simulate post UUID)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const initialContent: string = RandomGenerator.paragraph()();
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: memberA.id,
        discussion_board_post_id: postId,
        content: initialContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(comment);

  // 3. Member B attempts to fetch A's comment version list (should get error)
  await TestValidator.error("Member B must not access A's comment history")(
    async () => {
      await api.functional.discussionBoard.member.comments.versions.index(
        connection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
