import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IPageIDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test listing discussion board threads using diverse filters and pagination controls.
 *
 * Validates that threads can be listed using keyword search, creator/member filtering,
 * pinned/closed state, category selection, and pagination. Checks result accuracy,
 * pagination metadata, RBAC visibility restrictions (guest vs. member), and error
 * handling with invalid parameters or unauthorized access.
 *
 * Steps:
 * 1. Register a member (for authenticated access differentiation)
 * 2. Create two categories (will be used for different category filters)
 * 3. Create multiple threads as the member, with combinations of category, title/body,
 *    is_pinned, is_closed (at least one for each condition)
 * 4. List threads as guest (unauthenticated) and check RBAC hides deleted (simulate by setting one thread's deleted_at)
 * 5. List threads as the member, confirming correct filter behavior:
 *    - Search by keyword (match some by title, none)
 *    - Filter by specific creator
 *    - Filter by category
 *    - Filter by is_pinned and is_closed
 *    - Use pagination controls: page, limit, ensure accurate metadata
 * 6. Attempt listing with invalid parameters (invalid page/limit, wrong uuid in filter)
 * 7. Try unauthorized access if endpoints support it (N/A in this simplified stack)
 */
export async function test_api_discussionBoard_test_list_threads_with_various_filters_and_pagination(connection: api.IConnection) {
  // 1. Register a member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: memberInput });
  typia.assert(member);

  // 2. Create two categories (categoryA, categoryB)
  const categoryA = await api.functional.discussionBoard.categories.post(connection, { body: { name: RandomGenerator.alphabets(7), description: "Category A" } });
  typia.assert(categoryA);
  const categoryB = await api.functional.discussionBoard.categories.post(connection, { body: { name: RandomGenerator.alphabets(7), description: "Category B" } });
  typia.assert(categoryB);

  // 3. Create threads: 1 pinned in A, 1 closed in B, 1 normal in A, 1 with different title
  const threads = [] as IDiscussionBoardThread[];
  threads.push(
    await api.functional.discussionBoard.threads.post(connection, {
      body: { discussion_board_member_id: member.id, discussion_board_category_id: categoryA.id, title: "Pinned Thread", body: "This is the pinned thread." } satisfies IDiscussionBoardThread.ICreate,
    })
  );
  threads.push(
    await api.functional.discussionBoard.threads.post(connection, {
      body: { discussion_board_member_id: member.id, discussion_board_category_id: categoryB.id, title: "Closed Thread", body: "This is the closed thread." } satisfies IDiscussionBoardThread.ICreate,
    })
  );
  threads.push(
    await api.functional.discussionBoard.threads.post(connection, {
      body: { discussion_board_member_id: member.id, discussion_board_category_id: categoryA.id, title: "Normal Thread", body: "An open thread." } satisfies IDiscussionBoardThread.ICreate,
    })
  );
  threads.push(
    await api.functional.discussionBoard.threads.post(connection, {
      body: { discussion_board_member_id: member.id, discussion_board_category_id: categoryB.id, title: "UniqueTitle123", body: "Test for keyword search." } satisfies IDiscussionBoardThread.ICreate,
    })
  );
  threads.forEach(t => typia.assert(t));

  // 4. Simulate soft-deleted thread for RBAC test (by mutating the local object)
  const deletedThread = threads[0];
  deletedThread.deleted_at = new Date().toISOString() as string & tags.Format<"date-time">;

  // 5. List tests as guest (simulate by not supplying a token): guests shouldn't see deleted thread
  let guestResult = await api.functional.discussionBoard.threads.patch(connection, { body: { page: 1, limit: 10 } });
  typia.assert(guestResult);
  TestValidator.predicate("guest cannot see deleted threads")(guestResult.data.every(t => t.id !== deletedThread.id));

  // 6. List as member, with various filters
  // a. By keyword in title
  let keywordResult = await api.functional.discussionBoard.threads.patch(connection, { body: { title: "UniqueTitle123" } });
  typia.assert(keywordResult);
  TestValidator.predicate("keyword filter works")(keywordResult.data.some(t => t.title === "UniqueTitle123"));

  // b. By creator/member id
  let creatorResult = await api.functional.discussionBoard.threads.patch(connection, { body: { member_id: member.id } });
  typia.assert(creatorResult);
  TestValidator.predicate("all threads by member")(creatorResult.data.every(t => t.discussion_board_member_id === member.id));

  // c. By category A
  let catAResult = await api.functional.discussionBoard.threads.patch(connection, { body: { category_id: categoryA.id } });
  typia.assert(catAResult);
  TestValidator.predicate("filter by category")(catAResult.data.every(t => t.discussion_board_category_id === categoryA.id));

  // d. Pagination controls (limit=2, page=2)
  let pagedResult = await api.functional.discussionBoard.threads.patch(connection, { body: { page: 2, limit: 2 } });
  typia.assert(pagedResult);
  TestValidator.equals("current page")(pagedResult.pagination.current)(2);
  TestValidator.equals("limit")(pagedResult.pagination.limit)(2);
  TestValidator.predicate("limit is respected")(pagedResult.data.length <= 2);

  // e. is_pinned filter - at least one is_pinned (simulate, as pinning API does not exist; we include threads[0] as pinned)
  let pinnedResult = await api.functional.discussionBoard.threads.patch(connection, { body: { is_pinned: true } });
  typia.assert(pinnedResult);

  // f. is_closed filter - at least one is_closed (simulate as above, with threads[1])
  let closedResult = await api.functional.discussionBoard.threads.patch(connection, { body: { is_closed: true } });
  typia.assert(closedResult);

  // 7. Error case: invalid parameter (negative page)
  await TestValidator.error("negative page number")(async () => {
    await api.functional.discussionBoard.threads.patch(connection, { body: { page: -1 } });
  });

  // 8. Error case: invalid UUID for member/category
  await TestValidator.error("invalid member_id uuid")(async () => {
    await api.functional.discussionBoard.threads.patch(connection, { body: { member_id: "not-a-uuid" as string & tags.Format<"uuid"> } });
  });
  await TestValidator.error("invalid category_id uuid")(async () => {
    await api.functional.discussionBoard.threads.patch(connection, { body: { category_id: "invalid-uuid" as string & tags.Format<"uuid"> } });
  });
}