import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validates that an admin user can successfully create a moderation flag on a
 * comment.
 *
 * Business context: Admins occasionally need to flag user-generated comments as
 * inappropriate, spam, or otherwise requiring moderation. This action creates a
 * new moderation flag associated with a target comment, which can later be
 * referenced during moderation review workflows.
 *
 * Step-by-step process:
 *
 * 1. Create a comment as a member (serves as the flag target).
 * 2. Grant admin privileges to a user (so they have authorization).
 * 3. As that admin, create a moderation flag on the previously created comment,
 *    specifying a flag_type (e.g., 'inappropriate') and flag_source (e.g.,
 *    'manual').
 * 4. Assert that the response contains the correct comment_id, the chosen
 *    flag_type/source, correct admin association, and a generated flag ID.
 * 5. Assert that the flag is properly prepared for future moderation workflows.
 */
export async function test_api_discussionBoard_test_admin_create_flag_on_comment_successfully(
  connection: api.IConnection,
) {
  // 1. Create a comment as a member (serves as the flag target)
  const member_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const post_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentContent: string = RandomGenerator.paragraph()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member_id,
        discussion_board_post_id: post_id,
        content: commentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Grant admin privileges to a user
  const admin_user_identifier: string = typia.random<string>();
  const granted_at: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: admin_user_identifier,
        granted_at,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 3. As the admin, create a moderation flag on the comment
  const flag_type = "inappropriate";
  const flag_source = "manual";
  const flag = await api.functional.discussionBoard.admin.contentFlags.create(
    connection,
    {
      body: {
        comment_id: comment.id,
        flagged_by_admin_id: admin.id,
        flag_type,
        flag_source,
      } satisfies IDiscussionBoardContentFlag.ICreate,
    },
  );
  typia.assert(flag);

  // 4. Assert correctness of flag record
  TestValidator.equals("flag linked to correct comment")(flag.comment_id)(
    comment.id,
  );
  TestValidator.equals("flag_type matches")(flag.flag_type)(flag_type);
  TestValidator.equals("flag_source matches")(flag.flag_source)(flag_source);
  TestValidator.equals("admin flagged")(flag.flagged_by_admin_id)(admin.id);
  TestValidator.predicate("flag has generated id")(
    typeof flag.id === "string" && flag.id.length > 0,
  );
}
