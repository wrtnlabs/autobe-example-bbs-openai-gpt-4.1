import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validates moderator/admin privilege to edit any post in the discussion board.
 *
 * This E2E test verifies that after a post is created by a member, another account with admin or moderator privileges can update that post despite not being its author. This simulates the moderator/admin workflow and ensures enforcement of the required business rule:
 * - Non-owners with sufficient privilege may update post content or related metadata (audit fields should reflect the correct change).
 *
 * Test workflow:
 * 1. Register a member (user A) for authorship of the post
 * 2. Register a second member (user B) who will act as admin/moderator (simulate admin/mod privilege)
 * 3. Create a thread authored by user A
 * 4. User A creates a post in that thread
 * 5. User B (admin/moderator role in this test context) updates user A's post (changes post body and sets is_edited)
 * 6. Confirm the update succeeded: the new post body is applied, is_edited flag is set, and updated_at timestamp is updated
 */
export async function test_api_discussionBoard_test_update_post_by_moderator_or_admin(
  connection: api.IConnection,
) {
  // 1. Register member A (post author)
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberA);

  // 2. Register member B (admin/moderator simulation)
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberB);

  // 3. Create a thread authored by memberA
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberA.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(),
      body: RandomGenerator.content()()(),
    },
  });
  typia.assert(thread);

  // 4. User A creates a post in the thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberA.id,
      body: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(post);

  // 5. Moderator/admin B updates user A's post (simulate permission)
  const updatedBody = RandomGenerator.paragraph()();
  const updateResult = await api.functional.discussionBoard.posts.putById(connection, {
    id: post.id,
    body: {
      body: updatedBody,
      is_edited: true,
    },
  });
  typia.assert(updateResult);

  // 6. Confirm update applied
  TestValidator.equals("updated body")(updateResult.body)(updatedBody);
  TestValidator.predicate("is_edited flag updated")(!!updateResult.is_edited);
  TestValidator.notEquals("updated_at changed")(updateResult.updated_at)(post.updated_at);
}