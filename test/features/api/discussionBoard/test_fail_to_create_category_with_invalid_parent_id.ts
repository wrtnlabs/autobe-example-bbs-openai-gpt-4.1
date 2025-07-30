import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * 테스트: 논의 게시판 관리자 카테고리 생성 시 잘못된 parent_id 입력 처리
 *
 * 이 테스트는 논의 게시판의 카테고리 관리에서, admin 사용자가 존재하지 않는 parent_id(무작위 uuid)를 입력해 카테고리를
 * 생성 시도할 때, 시스템이 참조 무결성을 검증하여 에러로 응답하는지 확인합니다. 정상 동작이라면, API는 성공적으로 카테고리를 생성하지
 * 않고, 적절한 에러를 반환해야 합니다.
 *
 * [테스트 절차 및 핵심 검증]
 *
 * 1. 존재하지 않는 무작위 uuid를 parent_id로 하여 카테고리 생성 시도
 * 2. 정상적으로 에러가 발생하고(예외 발생), 실제로 카테고리가 생성되지 않음을 확인
 * 3. (가능하다면) 반환 에러가 parent_id의 참조 무결성 오류임을 명시하는지 추가 체크
 */
export async function test_api_discussionBoard_test_fail_to_create_category_with_invalid_parent_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 parent_id(uuid)로 새로운 카테고리 생성 시도
  const invalidParentId = typia.random<string & tags.Format<"uuid">>();
  const categoryName = `TestInvalidParentId-${invalidParentId}`;
  await TestValidator.error("존재하지 않는 parent_id 입력시 에러 발생해야 함")(
    async () => {
      await api.functional.discussionBoard.admin.categories.create(connection, {
        body: {
          name: categoryName,
          is_active: true,
          parent_id: invalidParentId,
        } satisfies IDiscussionBoardCategory.ICreate,
      });
    },
  );
}
