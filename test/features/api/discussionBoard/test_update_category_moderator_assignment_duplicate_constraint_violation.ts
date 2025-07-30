import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that updating a moderator assignment to a moderator/category pair that
 * already exists fails (unique constraint).
 *
 * 시나리오:
 *
 * 1. 새로운 토론 게시판 카테고리를 생성한다.
 * 2. 모더레이터 A를 생성한다.
 * 3. 모더레이터 B를 생성한다.
 * 4. 카테고리에 모더레이터 A를 할당한다 (assignmentA).
 * 5. 같은 카테고리에 모더레이터 B를 할당한다 (assignmentB).
 * 6. AssignmentB를 업데이트하여, 이미 해당 카테고리에 할당된 모더레이터 A로 변경을 시도한다.
 * 7. 이때 API가 고유성 제약(중복 할당) 위반 에러를 반환해야 하며, 중복 할당이 생성되지 않음이 보장된다.
 *
 * 이 테스트는 카테고리-모더레이터 쌍의 복합 유니크 제약을 정확히 검증한다.
 */
export async function test_api_discussionBoard_test_update_category_moderator_assignment_duplicate_constraint_violation(
  connection: api.IConnection,
) {
  // 1. 새로운 토론 카테고리 생성
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: `카테고리_${RandomGenerator.alphabets(8)}`,
        is_active: true,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
      },
    },
  );
  typia.assert(category);

  // 2. 모더레이터 A 생성
  const moderatorA =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: `modA_${RandomGenerator.alphaNumeric(10)}`,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderatorA);

  // 3. 모더레이터 B 생성
  const moderatorB =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: `modB_${RandomGenerator.alphaNumeric(10)}`,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderatorB);

  // 4. 카테고리에 모더레이터 A 할당
  const assignmentA =
    await api.functional.discussionBoard.admin.categories.categoryModerators.create(
      connection,
      {
        categoryId: category.id,
        body: {
          category_id: category.id,
          moderator_id: moderatorA.id,
        },
      },
    );
  typia.assert(assignmentA);

  // 5. 같은 카테고리에 모더레이터 B 할당
  const assignmentB =
    await api.functional.discussionBoard.admin.categories.categoryModerators.create(
      connection,
      {
        categoryId: category.id,
        body: {
          category_id: category.id,
          moderator_id: moderatorB.id,
        },
      },
    );
  typia.assert(assignmentB);

  // 6. assignmentB를 업데이트하여 이미 존재하는 쌍(카테고리+ModeratorA)로 변경을 시도 → 유니크 에러 발생해야 함
  await TestValidator.error(
    "동일 카테고리-모더레이터 중복 할당시 유니크 제약 오류 발생",
  )(async () => {
    await api.functional.discussionBoard.admin.categories.categoryModerators.update(
      connection,
      {
        categoryId: category.id,
        categoryModeratorId: assignmentB.id,
        body: {
          moderator_id: moderatorA.id,
        },
      },
    );
  });
}
