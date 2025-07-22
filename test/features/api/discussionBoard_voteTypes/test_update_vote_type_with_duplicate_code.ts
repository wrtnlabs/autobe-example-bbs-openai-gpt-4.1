import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * Validate that updating a vote type to a duplicate code fails.
 *
 * This test ensures code uniqueness among vote types: when attempting to update an existing vote type's code to one already in use by another, the system must reject the operation with an error (such as HTTP 409 Conflict for duplicate code).
 *
 * Steps:
 * 1. Create the first vote type (A) with an initial unique code (codeA).
 * 2. Create the second vote type (B) with a distinct, unique code (codeB).
 * 3. Attempt to update vote type A to use codeB (the code in B, which would be a duplicate).
 * 4. Confirm the API call fails due to uniqueness constraint violation (e.g., error thrown/HTTP 409).
 *
 * This guards against code collisions at both creation and update, ensuring vote type 'code' fields remain unique in the system.
 */
export async function test_api_discussionBoard_voteTypes_test_update_vote_type_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create the first vote type
  const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const codeA = `uniqueA_${uniqueSuffix}`;
  const codeB = `uniqueB_${uniqueSuffix}`;

  const voteTypeA = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: codeA,
      name: `VoteTypeA_${uniqueSuffix}`,
      description: "First vote type for duplicate test",
    } satisfies IDiscussionBoardVoteType.ICreate,
  });
  typia.assert(voteTypeA);

  // 2. Create the second vote type with a distinct code
  const voteTypeB = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: codeB,
      name: `VoteTypeB_${uniqueSuffix}`,
      description: "Second vote type for duplicate test",
    } satisfies IDiscussionBoardVoteType.ICreate,
  });
  typia.assert(voteTypeB);

  // 3. Attempt to update the first vote type to have the same code as the second (should fail)
  await TestValidator.error("duplicate code should not be allowed on update")(
    async () => {
      await api.functional.discussionBoard.voteTypes.putById(connection, {
        id: voteTypeA.id,
        body: {
          code: codeB, // duplicate code
          name: "UpdatedVoteTypeA",
          description: "Trying to assign duplicate code",
        } satisfies IDiscussionBoardVoteType.IUpdate,
      });
    },
  );
}