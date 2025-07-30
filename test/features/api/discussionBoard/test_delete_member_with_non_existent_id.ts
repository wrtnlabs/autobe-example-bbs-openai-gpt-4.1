import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test error handling when deleting a member using a non-existent or random
 * UUID as memberId.
 *
 * The purpose of this test is to validate that the admin deletion endpoint
 * behaves correctly when given an identifier that does not correspond to any
 * existing membership record. This is to ensure the system responds with a
 * not-found error, and that no unintended data changes or deletions occur to
 * other member records as a result of this operation.
 *
 * Test Steps:
 *
 * 1. Attempt to delete a member by sending the erase API call with a random UUID
 *    for memberId.
 * 2. Verify that the API responds with a not-found error (using
 *    TestValidator.error).
 * 3. Optionally, confirm that the system state is unchanged (out of scope if no
 *    list/query is available).
 */
export async function test_api_discussionBoard_admin_members_erase_with_non_existent_id(
  connection: api.IConnection,
) {
  // 1. Attempt to delete a member using a random, non-existent UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();

  // 2. Validate that a not-found error is thrown
  await TestValidator.error(
    "should throw not-found error when deleting non-existent member",
  )(async () => {
    await api.functional.discussionBoard.admin.members.erase(connection, {
      memberId: randomId,
    });
  });
}
