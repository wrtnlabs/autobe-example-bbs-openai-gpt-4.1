import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * Validate the creation of a new vote type as an administrator.
 *
 * This test checks that an admin can create a new vote type by supplying a unique code and name, as well as an optional description. It covers positive-case creation with all valid fields, ensures that the API returns the correct object with all audit fields (including id, created_at, updated_at), and validates uniqueness constraints for code and name.
 *
 * Steps:
 * 1. Successfully create a vote type with unique values for code and name, providing all required and optional fields.
 * 2. Ensure the response’s fields (id, code, name, description, created_at, updated_at) are correctly set and follow business/data formats.
 * 3. Attempt to create a duplicate vote type with the same code to validate that a uniqueness constraint is enforced (should fail).
 */
export async function test_api_discussionBoard_test_create_vote_type_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Successfully create a vote type with unique values
  const uniqueCode = `autotest_${RandomGenerator.alphaNumeric(8)}`;
  const uniqueName = `TestVoteType_${RandomGenerator.alphaNumeric(6)}`;

  const createInput: IDiscussionBoardVoteType.ICreate = {
    code: uniqueCode,
    name: uniqueName,
    description: "테스트용 투표 유형 설명입니다.",
  };

  const created = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: createInput,
  });
  typia.assert(created);
  TestValidator.equals("code matches")(created.code)(uniqueCode);
  TestValidator.equals("name matches")(created.name)(uniqueName);
  TestValidator.equals("description matches")(created.description)(createInput.description);
  TestValidator.predicate("id format is uuid")((typeof created.id === "string") && /^[0-9a-f-]{36}$/i.test(created.id));
  TestValidator.predicate("created_at is ISO8601 time")(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(created.created_at));
  TestValidator.predicate("updated_at is ISO8601 time")(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(created.updated_at));

  // 2. Attempt to create a duplicate code (should fail with uniqueness error)
  await TestValidator.error("duplicate code should be rejected")(async () => {
    await api.functional.discussionBoard.voteTypes.post(connection, {
      body: {
        code: uniqueCode,
        name: uniqueName + "2",
        description: "중복코드 테스트",
      },
    });
  });
}