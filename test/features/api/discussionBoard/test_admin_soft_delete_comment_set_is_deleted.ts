import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate the admin's soft-delete functionality for discussion board comments.
 *
 * Business Context: Soft-deletion is a crucial moderation operation where an
 * admin marks a comment as 'deleted' (is_deleted=true) without physically
 * removing its record from the database. This allows for auditing, restoration,
 * and hiding inappropriate or unwanted content from ordinary users while
 * preserving full moderation visibility.
 *
 * Workflow:
 *
 * 1. Precondition: Create a test comment using the member comment creation
 *    endpoint (setup phase).
 * 2. As an admin, perform a soft-delete by updating is_deleted to true via the
 *    admin comment update API.
 * 3. Verify that the API response shows is_deleted=true and the comment id is
 *    unchanged, confirming the record is not removed.
 * 4. Optionally, retrieve or inspect the returned record to confirm audit fields
 *    and business logic are respected (created_at/updated_at).
 * 5. (Edge): Optionally, test a repeated soft-delete update to verify idempotency
 *    (should not cause errors or change intent).
 */
export async function test_api_discussionBoard_test_admin_soft_delete_comment_set_is_deleted(
  connection: api.IConnection,
) {
  // 1. Precondition: Create a comment as a normal member
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentContent = RandomGenerator.paragraph()();
  const createdComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: memberId,
        discussion_board_post_id: postId,
        content: commentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(createdComment);

  // 2. Admin soft-deletes the comment
  const updatedComment =
    await api.functional.discussionBoard.admin.comments.update(connection, {
      commentId: createdComment.id,
      body: {
        is_deleted: true,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);
  TestValidator.equals("is_deleted should be true")(updatedComment.is_deleted)(
    true,
  );
  TestValidator.equals("comment ID must not change")(updatedComment.id)(
    createdComment.id,
  );

  // 3. Optionally validate audit fields and other invariants
  TestValidator.predicate("updated_at should be later or equal to created_at")(
    new Date(updatedComment.updated_at).getTime() >=
      new Date(createdComment.created_at).getTime(),
  );

  // 4. Edge: Repeat soft delete & validate idempotency (should remain true and not error)
  const idempotentDelete =
    await api.functional.discussionBoard.admin.comments.update(connection, {
      commentId: createdComment.id,
      body: {
        is_deleted: true,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(idempotentDelete);
  TestValidator.equals("idempotent is_deleted still true")(
    idempotentDelete.is_deleted,
  )(true);
  TestValidator.equals("idempotent comment id unchanged")(idempotentDelete.id)(
    createdComment.id,
  );
}
