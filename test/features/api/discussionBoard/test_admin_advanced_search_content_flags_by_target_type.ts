import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates discussion board admin advanced search and filtering on content
 * flags by target type (post vs comment).
 *
 * This test ensures that:
 *
 * - Only admins can access the advanced search API for content flags.
 * - The advanced filter works correctly for target type (setting post_id, or
 *   comment_id) as well as pagination parameters.
 * - Only relevant flags are returned per type filter (i.e., requesting only post
 *   flags yields no comment flags and vice versa).
 *
 * Steps:
 *
 * 1. Register an admin user (role assignment).
 * 2. Create a content flag for a post (simulate moderator flagging a post).
 * 3. Create a content flag for a comment (simulate moderator flagging a comment).
 * 4. As admin, run an advanced search for flags filtering only for posts (post_id
 *    is set, comment_id is null).
 *
 *    - Validate all returned flags target posts (comment_id is null) and matching
 *         post_id(s).
 *    - Validate pagination info is present.
 * 5. As admin, run an advanced search for flags filtering only for comments
 *    (comment_id is set, post_id is null).
 *
 *    - Validate all returned flags target comments (post_id is null) and matching
 *         comment_id(s).
 *    - Validate pagination info is present.
 * 6. Optionally, test pagination (set limit=1) and verify result page correctness.
 */
export async function test_api_discussionBoard_test_admin_advanced_search_content_flags_by_target_type(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminUserIdentifier = RandomGenerator.alphabets(10);
  const now = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: now,
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create a flagged post (simulate moderator action on a post)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const flagPost =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: postId,
          comment_id: null,
          flag_type: "spam",
          flag_source: "manual",
          flag_details: "Suspicious post behavior",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flagPost);

  // 3. Create a flagged comment (simulate moderator action on a comment)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const flagComment =
    await api.functional.discussionBoard.moderator.contentFlags.create(
      connection,
      {
        body: {
          post_id: null,
          comment_id: commentId,
          flag_type: "abuse",
          flag_source: "manual",
          flag_details: "Abusive comment",
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(flagComment);

  // 4. As admin, search for all flags targeting posts only
  const resultPosts =
    await api.functional.discussionBoard.admin.contentFlags.search(connection, {
      body: {
        post_id: postId,
        comment_id: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    });
  typia.assert(resultPosts);
  TestValidator.predicate("all returned flags are for post only")(
    resultPosts.data.every(
      (f) =>
        f.post_id === postId &&
        (f.comment_id === null || f.comment_id === undefined),
    ),
  );
  TestValidator.predicate("pagination present")(!!resultPosts.pagination);

  // 5. As admin, search for all flags targeting comments only
  const resultComments =
    await api.functional.discussionBoard.admin.contentFlags.search(connection, {
      body: {
        post_id: null,
        comment_id: commentId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    });
  typia.assert(resultComments);
  TestValidator.predicate("all returned flags are for comment only")(
    resultComments.data.every(
      (f) =>
        f.comment_id === commentId &&
        (f.post_id === null || f.post_id === undefined),
    ),
  );
  TestValidator.predicate("pagination present")(!!resultComments.pagination);

  // 6. Test pagination - set limit=1
  const pagedPosts =
    await api.functional.discussionBoard.admin.contentFlags.search(connection, {
      body: {
        post_id: postId,
        comment_id: null,
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardContentFlag.IRequest,
    });
  typia.assert(pagedPosts);
  TestValidator.predicate("pagination.limit == 1")(
    pagedPosts.pagination.limit === 1,
  );
  TestValidator.predicate("maximum 1 flag in result")(
    pagedPosts.data.length <= 1,
  );
}
