import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test creating a new post as a valid member (success case).
 *
 * This end-to-end test covers the process of creating a member, creating a thread,
 * posting a reply in that thread, and verifying the resulting state. It focuses on
 * the success path where all inputs are valid and all relationships are properly
 * linked. The workflow strictly follows business requirements: only a registered,
 * active member can post a reply, and a post must properly reference an existing
 * thread via foreign key. This test confirms audit fields, relationship linkage,
 * and persistence.
 *
 * Workflow:
 * 1. Register a new member via /discussionBoard/members (collect resulting member info for author/linkage)
 * 2. Create a new thread in /discussionBoard/threads, associating it to the member (collect resulting thread info)
 * 3. Post a new reply using /discussionBoard/posts, referencing both the member and thread (collect resulting post info)
 * 4. Validate all critical fields of the created post: content/body, author (member linkage), thread linkage, created_at timestamp, is_edited=false, etc.
 * 5. If a "get post detail" endpoint is added in future, fetch and validate, but as of now, only creation and returned data are validated.
 *
 * Expected result: Post creation succeeds with valid relationships, audit fields, and data integrity.
 */
export async function test_api_discussionBoard_test_create_post_success(
  connection: api.IConnection,
) {
  // 1. Register a new member (author for the post)
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);
  TestValidator.equals("member username")(member.username)(memberInput.username);
  TestValidator.equals("member email")(member.email)(memberInput.email);
  TestValidator.equals("member display_name")(member.display_name)(memberInput.display_name);
  TestValidator.predicate("member is active")(member.is_active === true);

  // 2. Create a thread for post to belong to
  const threadInput: IDiscussionBoardThread.ICreate = {
    discussion_board_member_id: member.id,
    // For this test, category must exist; use a random uuid as required.
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()(1)(),
  };
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: threadInput,
  });
  typia.assert(thread);
  TestValidator.equals("thread author")(thread.discussion_board_member_id)(member.id);
  TestValidator.equals("thread title")(thread.title)(threadInput.title);

  // 3. Post a reply to the thread
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: thread.id,
    discussion_board_member_id: member.id,
    body: RandomGenerator.paragraph()(2),
  };
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: postInput,
  });
  typia.assert(post);
  TestValidator.equals("post body")(post.body)(postInput.body);
  TestValidator.equals("post author")(post.discussion_board_member_id)(member.id);
  TestValidator.equals("post thread link")(post.discussion_board_thread_id)(thread.id);
  TestValidator.predicate("post is not edited")(post.is_edited === false);
  TestValidator.predicate("post created_at valid")(typeof post.created_at === "string" && post.created_at.length > 0);
  TestValidator.predicate("post not deleted")(post.deleted_at === null || post.deleted_at === undefined);

  // All steps passed: post was successfully created, linked to author and thread, with valid audit fields
}