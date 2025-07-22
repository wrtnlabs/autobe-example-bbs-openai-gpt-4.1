import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test thread creation with valid and invalid payloads and user roles.
 *
 * This test validates:
 * 1. Thread creation with valid data by a registered member (happy path)
 * 2. Attempting to create a thread with missing required fields (should fail)
 * 3. Invalid title/body lengths (should fail)
 * 4. Using an invalid/nonexistent category (should fail)
 * 5. Attempting creation as a guest (no member registration, should fail)
 * 6. (If possible) Simulate a banned/inactive member making request (skipped - not exposed by API)
 * 7. The returned thread has correct member association and is open by default
 *
 * Steps:
 * 1. Register a member using the discussionBoard members API
 * 2. Create a category using the discussionBoard categories API
 * 3. Create a thread with all required fields using the member
 *    - Assert thread is created, is_open = false, is_pinned = false, creator/category correct
 * 4. Attempt to create a thread with each required field missing in turn (should error)
 * 5. Attempt to create a thread with invalid/empty title/body (should error)
 * 6. Attempt to create a thread with an invalid/nonexistent category (should error)
 * 7. Attempt to create a thread as a guest (no registered member, should error)
 * 8. (If possible) Attempt to create a thread with a banned/inactive member (not feasible with given API)
 */
export async function test_api_discussionBoard_test_create_thread_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // Step 1: Register a discussion board member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberInput });
  typia.assert(member);

  // Step 2: Create a category for the discussion threads
  const categoryInput: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph()(),
  };
  const category = await api.functional.discussionBoard.categories.post(connection, { body: categoryInput });
  typia.assert(category);

  // Step 3: Create a thread with valid required data as the member
  const threadInput: IDiscussionBoardThread.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_category_id: category.id,
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
  };
  const thread = await api.functional.discussionBoard.threads.post(connection, { body: threadInput });
  typia.assert(thread);
  TestValidator.equals("creator id")(thread.discussion_board_member_id)(member.id);
  TestValidator.equals("category id")(thread.discussion_board_category_id)(category.id);
  TestValidator.equals("thread open by default")(!thread.is_closed)(true);
  TestValidator.equals("thread is not pinned by default")(thread.is_pinned)(false);

  // Step 4: Attempt to create a thread with missing required fields
  for (const missing of ["discussion_board_member_id", "discussion_board_category_id", "title", "body"] as const) {
    const partial = { ...threadInput } as any;
    delete partial[missing];
    await TestValidator.error(`missing ${missing}`)(async () =>
      api.functional.discussionBoard.threads.post(connection, { body: partial })
    );
  }

  // Step 5: Attempt to create a thread with invalid/empty title and body
  const invalidPairs: [keyof IDiscussionBoardThread.ICreate, string][] = [
    ["title", ""],
    ["body", ""],
    ["title", "a"],
    ["body", "a"],
  ];
  for (const [field, value] of invalidPairs) {
    const invalid = { ...threadInput, [field]: value };
    await TestValidator.error(`invalid ${String(field)} value`)(async () =>
      api.functional.discussionBoard.threads.post(connection, { body: invalid })
    );
  }

  // Step 6: Invalid/nonexistent category id
  const badCategory = {
    ...threadInput,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
  };
  await TestValidator.error("invalid category id")(async () =>
    api.functional.discussionBoard.threads.post(connection, { body: badCategory })
  );

  // Step 7: Attempt to create a thread as a guest (simulate by using a random uuid for member id that is not registered)
  const guestInput: IDiscussionBoardThread.ICreate = {
    ...threadInput,
    discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
  };
  await TestValidator.error("guest or unregistered member")(async () =>
    api.functional.discussionBoard.threads.post(connection, { body: guestInput })
  );

  // Step 8: Inactive/banned member cannot create (not possible with available API, so this is skipped)
}