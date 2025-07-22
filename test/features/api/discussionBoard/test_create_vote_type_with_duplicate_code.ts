import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * Validate enforcement of unique vote type codes in the discussion board system.
 *
 * This test confirms that the system will not allow creation of duplicate vote type codes:
 * 
 * 1. Admin first registers a new vote type with a unique code (success expected).
 * 2. Immediately, admin attempts to register a second vote type with the exact same code (conflict expected).
 *
 * Validation steps:
 * - Ensure the first creation succeeds and returns a valid IDiscussionBoardVoteType object.
 * - Ensure the second attempt fails (should throw an error, e.g., 409 conflict), because the code already exists.
 * - (Do not test TypeScript validation errors -- only business logic via runtime API.)
 */
export async function test_api_discussionBoard_test_create_vote_type_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create a vote type with a unique code
  const code = `dupCode_${Math.random().toString(36).slice(2, 10)}`;
  const voteTypeParams: IDiscussionBoardVoteType.ICreate = {
    code,
    name: `VoteType_${Math.random().toString(36).slice(2, 8)}`,
    description: "Test for duplicate code error.",
  };
  const voteType = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: voteTypeParams,
  });
  typia.assert(voteType);

  // 2. Attempt to create another vote type with the same code (should fail)
  await TestValidator.error("duplicate vote type code should fail")(
    async () => {
      await api.functional.discussionBoard.voteTypes.post(connection, {
        body: voteTypeParams,
      });
    },
  );
}