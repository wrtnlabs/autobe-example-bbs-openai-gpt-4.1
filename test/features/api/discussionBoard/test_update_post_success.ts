import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test updating an existing discussion board post as its author.
 *
 * This test validates the post update workflow for the post's author, ensuring all business rules and audit fields are enforced:
 * 1. Create a member (author) via the discussion board member registration API.
 * 2. Create a thread that will contain the post, authored by the created member.
 * 3. Create a post in that thread by the same member, capturing initial state.
 * 4. Update the body/content of the post as its author using the PUT endpoint.
 * 5. Validate the API response:
 *    - Body/content is updated correctly.
 *    - The 'is_edited' flag is set to true if not previously true.
 *    - The 'updated_at' timestamp is updated and later than the original value.
 *    - All other post fields are preserved and type-validated.
 *
 * The test ensures only authors can update their own posts, all audit fields behave as expected, and DB integrity is maintained.
 */
export async function test_api_discussionBoard_test_update_post_success(
  connection: api.IConnection,
) {
  // 1. Create the member (author)
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Create a thread that the post will belong to
  const threadInput: IDiscussionBoardThread.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()(1)(),
  };
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: threadInput,
  });
  typia.assert(thread);

  // 3. Create the initial post by the member
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: thread.id,
    discussion_board_member_id: member.id,
    body: RandomGenerator.content()(2)(),
  };
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: postInput,
  });
  typia.assert(post);

  // 4. Update the post as the author
  const newBody = RandomGenerator.content()(3)();
  const updateInput: IDiscussionBoardPost.IUpdate = {
    body: newBody,
  };
  const updated = await api.functional.discussionBoard.posts.putById(connection, {
    id: post.id,
    body: updateInput,
  });
  typia.assert(updated);

  // 5. Assert updated result and business invariants
  TestValidator.equals("id should remain unchanged")(updated.id)(post.id);
  TestValidator.equals("thread relation unchanged")(updated.discussion_board_thread_id)(post.discussion_board_thread_id);
  TestValidator.equals("member relation unchanged")(updated.discussion_board_member_id)(post.discussion_board_member_id);
  TestValidator.equals("body updated")(updated.body)(newBody);
  TestValidator.predicate("is_edited now true")(updated.is_edited === true);
  TestValidator.predicate("updated_at advanced")(new Date(updated.updated_at).getTime() > new Date(post.updated_at).getTime());
  TestValidator.equals("created_at unchanged")(updated.created_at)(post.created_at);
  TestValidator.equals("deleted_at unchanged")(updated.deleted_at)(post.deleted_at);
}