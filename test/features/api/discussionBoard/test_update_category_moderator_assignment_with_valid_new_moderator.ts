import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * 검증: 관리자가 토론 게시판 카테고리-모더레이터 할당을 다른 모더레이터로 정상 교체할 수 있어야 한다.
 *
 * 이 테스트는 대시보드 시나리오에서 실제 운영처럼 최소 두 명의 모더레이터가 있을 때, 신규 카테고리를 만들고 최초엔 모더레이터A를 할당한
 * 다음, 업데이트 API로 해당 할당을 모더레이터B로 교체하는 플로우를 검증한다.
 *
 * - 교체 후 category_moderators는 category_id, moderator_id 모두 올바르게 변경되어야 한다.
 * - 중복 (category, moderator) 조합이 추가 생성되면 안 된다(duplicate constraint 검증).
 * - 변경된 뒤엔, 같은 moderator_id로 다시 할당 API를 쓰면 반드시 실패해야 한다.
 *
 * 1. 모더레이터A, 모더레이터B 두 명 등록
 * 2. 카테고리 신규 생성
 * 3. 모더레이터A를 카테고리에 최초 할당
 * 4. 해당 할당을 update API로 모더레이터B로 교체
 * 5. 교체 내역이 정상 반영되었는지 검증
 * 6. 동일 (카테고리, 모더레이터) 조합 중복 할당 시도 시 에러 검증
 */
export async function test_api_discussionBoard_test_update_category_moderator_assignment_with_valid_new_moderator(
  connection: api.IConnection,
) {
  // 1. 모더레이터A, 모더레이터B 두 명 등록
  const userIdA = RandomGenerator.alphaNumeric(8);
  const userIdB = RandomGenerator.alphaNumeric(8);
  const granted_at: string = new Date().toISOString();

  const moderatorA =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: userIdA,
        granted_at,
        revoked_at: null,
      },
    });
  typia.assert(moderatorA);

  const moderatorB =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: userIdB,
        granted_at,
        revoked_at: null,
      },
    });
  typia.assert(moderatorB);

  // 2. 카테고리 신규 생성
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        is_active: true,
        description: "e2e test category",
        parent_id: null,
      },
    },
  );
  typia.assert(category);

  // 3. 모더레이터A를 먼저 할당
  const assignment =
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
  typia.assert(assignment);

  // 4. update API로 모더레이터B로 교체
  const updated =
    await api.functional.discussionBoard.admin.categories.categoryModerators.update(
      connection,
      {
        categoryId: category.id,
        categoryModeratorId: assignment.id,
        body: { moderator_id: moderatorB.id },
      },
    );
  typia.assert(updated);
  TestValidator.equals("categoryId")(updated.category_id)(category.id);
  TestValidator.equals("moderatorId")(updated.moderator_id)(moderatorB.id);
  TestValidator.notEquals("모더레이터가 변경됨")(updated.moderator_id)(
    moderatorA.id,
  );

  // 5. 같은 moderatorId로 동일 카테고리에 다시 할당 시도 시 에러여야 한다
  await TestValidator.error("중복 (카테고리, 모더레이터) 조합 불가")(
    async () => {
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
    },
  );
}
