import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategoryModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * 테스트 목적: 모더레이터가 할당되지 않은 카테고리에 대해 모더레이터 할당 목록 조회 시, 빈 목록이 반환되는지 검증합니다.
 *
 * 비즈니스 배경: 보드 관리자는 신규 카테고리를 추가할 수 있으며, 카테고리 생성 즉시 담당 모더레이터를 지정하지 않는 경우도 있습니다. 이
 * 때 카테고리별 담당자(모더레이터) 목록을 조회하면 반환 데이터가 없어야 하며, API가 빈 데이터(빈 배열) 구조를 올바르게 응답하는지
 * 확인해야 합니다.
 *
 * 테스트 시나리오 단계:
 *
 * 1. 새로운 관리(admin) 계정을 생성합니다.
 * 2. 신규 카테고리를 등록하되, 모더레이터 할당 없이 생성합니다.
 * 3. 해당 카테고리의 모더레이터 할당 목록을 조회합니다.
 * 4. 반환되는 페이징 데이터(data 배열)가 빈 배열임을 검증합니다.
 */
export async function test_api_discussionBoard_test_list_moderator_assignments_for_category_with_no_assignments(
  connection: api.IConnection,
) {
  // 1. 새로운 admin 계정 생성
  const userIdentifier: string = RandomGenerator.alphaNumeric(12);
  const now: string = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        granted_at: now,
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 2. 신규 카테고리 생성 (모더레이터 할당 없음)
  const categoryName: string = RandomGenerator.alphabets(10);
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        is_active: true,
        description: null,
        parent_id: null,
      },
    },
  );
  typia.assert(category);

  // 3. 해당 카테고리의 모더레이터 할당 목록 조회
  const page =
    await api.functional.discussionBoard.admin.categories.categoryModerators.index(
      connection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(page);

  // 4. data 배열이 빈 배열임을 검증
  TestValidator.equals("empty moderator data list")(page.data)([]);
}
