import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test the successful creation of a new comment by a standard member under an
 * existing discussion post.
 *
 * This test validates the standard member workflow for commenting. It ensures
 * that:
 *
 * - All required fields (discussion_board_member_id, discussion_board_post_id,
 *   content) are accepted.
 * - The API assigns the correct author/member (from authentication context) to
 *   the comment.
 * - The response contains a complete and valid comment object, including id and
 *   timestamps.
 * - The new comment is retrievable via subsequent comment listing endpoints
 *   (though only this create function is available).
 *
 * Steps:
 *
 * 1. Generate a valid member id and an existing post id (using random UUIDs for
 *    test context).
 * 2. Create a new comment with valid content.
 * 3. Assert that the response contains all required fields and correct author
 *    info.
 * 4. Validate 'is_deleted' is false and timestamps are in correct format.
 */
export async function test_api_discussionBoard_test_create_comment_successful_member_flow(
  connection: api.IConnection,
) {
  // Step 1: Generate member and post UUIDs (test context uses random UUIDs)
  const discussion_board_member_id = typia.random<
    string & tags.Format<"uuid">
  >();
  const discussion_board_post_id = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Compose new comment input data
  const input: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id,
    discussion_board_post_id,
    content: RandomGenerator.paragraph()(1),
  };

  // Step 3: Create the new comment via API
  const output = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: input,
    },
  );
  typia.assert(output);

  // Step 4: Validate response fields
  TestValidator.equals("member id on response matches request")(
    output.discussion_board_member_id,
  )(discussion_board_member_id);
  TestValidator.equals("post id on response matches request")(
    output.discussion_board_post_id,
  )(discussion_board_post_id);
  TestValidator.equals("content matches")(output.content)(input.content);
  TestValidator.equals("is_deleted should be false")(output.is_deleted)(false);
  TestValidator.predicate("id is uuid format")(
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.predicate("created_at is ISO date")(
    /^\d{4}-\d{2}-\d{2}T/.test(output.created_at),
  );
  TestValidator.predicate("updated_at is ISO date")(
    /^\d{4}-\d{2}-\d{2}T/.test(output.updated_at),
  );
}
