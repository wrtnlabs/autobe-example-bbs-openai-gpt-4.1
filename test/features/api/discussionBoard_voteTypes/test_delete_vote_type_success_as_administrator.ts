import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * Test successful soft-delete (logical delete) of a vote type as administrator by UUID.
 *
 * This test simulates an admin user creating a new unique vote type, then deleting it using the eraseById endpoint, and verifying that the deletion is properly performed as a soft delete (not hard removal).
 *
 * Key business verifications:
 * - The type is created and immediately deleted (thus not in use, so no FK or constraint violations occur).
 * - Because no listing or object-fetch endpoint for vote types is provided, post-deletion verification ("deleted_at" field, audit logs, absence from listings) cannot be directly checked and is omitted.
 * - If such endpoints existed, further checks would be included for compliance.
 * - We solely confirm the create and erase APIs complete without error and type assertion passes.
 *
 * Steps:
 * 1. Create a new vote type using a unique code and name.
 * 2. Delete that vote type by its UUID (soft-delete logic, only possible for types not in use).
 * 3. (If listing or detail read APIs existed, we would fetch to check for "deleted" marking and exclusion. Not possible here, so omitted.)
 */
export async function test_api_discussionBoard_voteTypes_test_delete_vote_type_success_as_administrator(
  connection: api.IConnection,
) {
  // 1. Create a new, unique vote type for testing
  const uniqueCode: string = `test-type-${Date.now()}`;
  const uniqueName: string = `테스트타입${Date.now()}`;

  const voteType = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: uniqueCode,
      name: uniqueName,
      description: "E2E 테스트를 위한 임시 투표 유형입니다.",
    },
  });
  typia.assert(voteType);

  // 2. Delete (soft-delete) the vote type by its UUID as admin
  await api.functional.discussionBoard.voteTypes.eraseById(connection, {
    id: voteType.id,
  });

  // 3. (No listing/lookup endpoint for vote types in provided APIs, so postcondition cannot be directly verified)
  //    (No audit log or 'deleted_at' check possible without a fetch endpoint)
  //    We confirm successful API calls and schema validation only.
}