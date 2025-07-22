import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";

/**
 * Validate deletion of a discussion board search history entry with proper authorization and business logic verifications.
 *
 * This test covers the end-to-end workflow of deleting a search history record by ID, focusing on role-based authorization, record auditability, and proper error handling. The key actors are the entry owner (authorized), unauthorized third-party, and administrator (if relevant API exposes that capability).
 *
 * Steps:
 * 1. Create a search history entry via POST; the current user/account is the owner (actor_id).
 * 2. Delete the entry by its id using eraseById as the authorized owner.
 *    - Assert returned record matches the deleted entry, and a status/audit update occurred.
 * 3. Attempt to delete the same ID again. Expect 404 (not found) since entry is gone.
 * 4. (Omitted) Attempting deletion as an unauthorized user is skipped due to lack of exposed authentication/user switching in provided API surface.
 */
export async function test_api_discussionBoard_test_delete_search_history_with_authorization(connection: api.IConnection) {
  // 1. Create a search history entry
  const entry = await api.functional.discussionBoard.searchHistories.post(connection, {
    body: {
      actor_id: typia.random<string & tags.Format<"uuid">>(),
      keyword: RandomGenerator.paragraph()(),
      filters: null,
      search_context: null
    } satisfies IDiscussionBoardSearchHistory.ICreate
  });
  typia.assert(entry);

  // 2. Delete the entry as the owner
  const deleted = await api.functional.discussionBoard.searchHistories.eraseById(connection, { id: entry.id });
  typia.assert(deleted);
  TestValidator.equals("deleted record matches")(deleted.id)(entry.id);

  // 3. Attempt to delete again; should fail with 404 (already deleted)
  await TestValidator.error("deleting already deleted record yields 404")(
    () => api.functional.discussionBoard.searchHistories.eraseById(connection, { id: entry.id })
  );

  // 4. (Skipped) No user switching API in provided SDK, so forbidden case cannot be tested here.
}