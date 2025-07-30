import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostVersion";

/**
 * Verify a registered member can create a new version (edit snapshot) of their
 * post, and business rules are enforced.
 *
 * This test ensures:
 *
 * 1. Only an authenticated member (original post owner) can create a new version
 *    of their post.
 * 2. Version creation updates: correct post reference, version is incremented,
 *    editor_member_id matches, and new body is stored.
 * 3. Preparation steps include creation of all required resources: member, topic,
 *    thread, and post.
 *
 * Step-by-step process:
 *
 * 1. Register a member (via admin endpoint, as only exposed API for creating
 *    members)
 * 2. Create a topic (member context, using a random valid category ID)
 * 3. Create a thread under the topic
 * 4. Create an initial post within the thread
 * 5. Create a new version of that post, i.e., simulate editing with new content
 * 6. Assert all business rule requirements in the returned version object (post
 *    reference, owner, versioning, and edited content)
 * 7. (Not implemented) Version listing validation—API for listing post versions is
 *    not available in this SDK
 */
export async function test_api_discussionBoard_test_create_post_version_with_valid_data_by_post_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberUserIdentifier = typia.random<string>();
  const joinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: joinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Member creates a topic (requires random valid category ID)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: "Test Topic " + typia.random<string>(),
        description: "Test topic description",
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 3. Member creates thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: "Test Thread " + typia.random<string>(),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Member creates initial post in the thread
  const postBody = "This is the original post body.";
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Member creates a new version of the post with new content
  const newBody = "This is a new revision of the content.";
  const version =
    await api.functional.discussionBoard.member.posts.versions.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          body: newBody,
        } satisfies IDiscussionBoardPostVersion.ICreate,
      },
    );
  typia.assert(version);

  // 6. Assert business rules in the returned version
  TestValidator.equals("post id matches")(version.discussion_board_post_id)(
    post.id,
  );
  TestValidator.equals("editor_member_id matches")(version.editor_member_id)(
    member.id,
  );
  TestValidator.equals("edited body matches")(version.body)(newBody);
  TestValidator.predicate("version is next version")(
    typeof version.version === "number" && version.version > 1,
  );

  // 7. (Skipped) No API provided to list all post versions for further validation.
}
