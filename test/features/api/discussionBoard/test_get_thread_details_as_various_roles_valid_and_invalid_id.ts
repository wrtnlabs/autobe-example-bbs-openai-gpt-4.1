import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * E2E test for retrieving thread details by ID as various roles, validating correct access and error responses.
 *
 * This test covers the core retrieval workflow and realistic error handling for thread detail fetch:
 *
 * 1. Registers a new member (thread owner)
 * 2. Creates a category for categorization
 * 3. Creates a thread as the new member
 * 4. As a guest (unauthenticated), retrieves thread by ID and asserts details are correct
 * 5. As the member (owner), retrieves thread by ID and asserts details are correct
 * 6. Attempts to fetch a non-existent thread by random UUID and asserts that an error is thrown
 *
 * Limitations: The current API set does not expose separate login, session, moderator, admin, or thread-delete/recovery endpoints.
 * As such, only 'guest' (unauthenticated) and 'member/owner' queries are simulated. Additional role-based/permission validation is not
 * feasible with the provided function set.
 */
export async function test_api_discussionBoard_test_get_thread_details_as_various_roles_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register new member (thread owner)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a new category for the thread
  const category = await api.functional.discussionBoard.categories.post(connection, {
    body: {
      name: RandomGenerator.alphabets(12),
      description: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardCategory.ICreate,
  });
  typia.assert(category);

  // 3. Create a thread in this category as the member
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member.id,
      discussion_board_category_id: category.id,
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 4. As a guest (unauthenticated), fetch thread by ID and assert result
  const threadForGuest = await api.functional.discussionBoard.threads.getById(connection, {
    id: thread.id,
  });
  typia.assert(threadForGuest);
  TestValidator.equals("thread data matches for guest")(threadForGuest)(thread);

  // 5. As the member (owner), fetch thread by ID and assert result
  // (Session simulation not possible; same call suffices in this API)
  const threadForMember = await api.functional.discussionBoard.threads.getById(connection, {
    id: thread.id,
  });
  typia.assert(threadForMember);
  TestValidator.equals("thread data matches for member")(threadForMember)(thread);

  // 6. Attempt to fetch a non-existent thread (should throw error)
  await TestValidator.error("Fetching non-existent thread should fail")(
    async () => {
      await api.functional.discussionBoard.threads.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}