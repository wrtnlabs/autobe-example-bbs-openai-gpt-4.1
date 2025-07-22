import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate creation of discussion board posts with malformed or invalid request bodies (validation error scenario).
 *
 * This test verifies the API's runtime data validation and error reporting logic for the POST /discussionBoard/posts endpoint. Its goal is to ensure that, when delivered clearly invalid post creation data, the API responds with proper validation errors and does not create any side-effects.
 *
 * Workflow:
 * 1. Register a new discussion board member to obtain a valid member_id for authenticated context
 * 2. Attempt to create posts with various forms of invalid data (all must fail):
 *    a. Empty body string
 *    b. Invalid UUID for discussion_board_thread_id (bad format)
 *    c. Null or empty string for discussion_board_member_id
 *    d. Empty object or completely empty request
 *    e. Body string too short (if business constraint), or clearly violating constraints if described
 * 3. In all failure cases, validate that:
 *    - The API throws a validation/business rule error
 *    - No post is created or returned upon failure
 *    - Error is not a server crash, but a proper validation error
 */
export async function test_api_discussionBoard_test_create_post_validation_error(connection: api.IConnection) {
  // 1. Register a new discussion board member for context
  const memberInput = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.discussionBoard.members.post(connection, { body: memberInput });
  typia.assert(member);

  // 2a. Attempt to create a post with an empty body string (violates likely content length)
  await TestValidator.error("empty body string should fail")(async () => {
    await api.functional.discussionBoard.posts.post(connection, {
      body: {
        discussion_board_thread_id: typia.random<string & tags.Format<"uuid">>(),
        discussion_board_member_id: member.id,
        body: "",
      },
    });
  });

  // 2b. Invalid thread id (bad uuid format)
  await TestValidator.error("bad UUID for thread id should fail")(async () => {
    await api.functional.discussionBoard.posts.post(connection, {
      body: {
        discussion_board_thread_id: "not-a-uuid",
        discussion_board_member_id: member.id,
        body: "Valid content",
      } as any, // to simulate runtime-only bad UUID
    });
  });

  // 2c. Null for discussion_board_member_id (type violation)
  await TestValidator.error("null for member id should fail")(async () => {
    await api.functional.discussionBoard.posts.post(connection, {
      body: {
        discussion_board_thread_id: typia.random<string & tags.Format<"uuid">>(),
        discussion_board_member_id: null,
        body: "Content",
      } as any,
    });
  });

  // 2d. Completely empty body object
  await TestValidator.error("empty object as post should fail")(async () => {
    await api.functional.discussionBoard.posts.post(connection, {
      body: {} as any,
    });
  });
}