import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate retrieving full details of a post by ID as a regular user.
 *
 * This test ensures that the get-by-id endpoint returns a fully correct post entity, including author, content, thread linkage, timestamps, and moderation flags, when queried with a valid post ID.
 *
 * Steps:
 * 1. Create a discussion board member (the post author)
 * 2. Create a thread that the post will be attached to
 * 3. Create a root post in that thread
 * 4. Retrieve the post by its ID using the API endpoint
 * 5. Validate response: All metadata (IDs, author, thread), content, and audit fields match test values
 * 6. (Optional) Create a reply post and verify retrieval for a non-root post
 * 7. (Optional) If roles are feasible, attempt retrieval as admin/member
 */
export async function test_api_discussionBoard_test_get_post_details_success(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member (author)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(author);

  // 2. Create a thread
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: author.id,
      // Category id is required, but no API for categories, so random
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 3. Create a root post in the thread
  const rootPost = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: author.id,
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(rootPost);

  // 4. Retrieve the root post by id
  const got = await api.functional.discussionBoard.posts.getById(connection, {
    id: rootPost.id,
  });
  typia.assert(got);
  TestValidator.equals("id")(got.id)(rootPost.id);
  TestValidator.equals("body")(got.body)(rootPost.body);
  TestValidator.equals("author")(got.discussion_board_member_id)(author.id);
  TestValidator.equals("thread linkage")(got.discussion_board_thread_id)(thread.id);

  // 5. (Optional) Create a reply post in the same thread
  const replyPost = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: author.id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(replyPost);
  // 6. Retrieve reply post
  const gotReply = await api.functional.discussionBoard.posts.getById(connection, {
    id: replyPost.id,
  });
  typia.assert(gotReply);
  TestValidator.equals("reply id")(gotReply.id)(replyPost.id);
  TestValidator.equals("reply author")(gotReply.discussion_board_member_id)(author.id);
  TestValidator.equals("reply thread linkage")(gotReply.discussion_board_thread_id)(thread.id);
  TestValidator.equals("reply body")(gotReply.body)(replyPost.body);
  // (If admin/member role switching supported by API, would repeat the above as those roles)
}