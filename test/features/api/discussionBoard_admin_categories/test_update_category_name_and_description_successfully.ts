import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * 관리자 권한으로 기존 게시판 카테고리의 이름과 설명을 수정하는 E2E 시나리오 (성공 케이스)
 *
 * - 카테고리명(name)은 반드시 유일하게 보장되어야 하며 변경 시 유일성 검증을 수행한다.
 * - Description(설명) 변경도 함께 테스트된다.
 * - 수정 요청 후 반환되는 category 객체에 새로운 값이 즉시 반영되는지 검증(원자성/일관성).
 * - Created_at, id 등 불변 필드는 변경 전 값과 동일함을 검증한다.
 * - Updated_at은 실제 수정 시각으로 변경되어야 한다.
 *
 * [프로세스]
 *
 * 1. (Given) 새로운 카테고리를 생성한다.(의존성 선행 작업)
 * 2. (When) 해당 category의 name, description을 새로운 값(충돌 없는 고유값)으로 수정 요청한다.
 * 3. (Then) 응답 객체에 name/description이 정상적으로 즉시 반영되었는지 확인한다.
 * 4. (Then) id, parent_id, is_active, created_at 등은 변하지 않았음을 검증.
 * 5. (Then) updated_at이 변경전 값과 다름을 검증한다.
 * 6. (Option) 감사 로그 등 추가 기능이 있다면 별도 확인 가능(현재는 미포함).
 */
export async function test_api_discussionBoard_admin_categories_test_update_category_name_and_description_successfully(
  connection: api.IConnection,
) {
  // 1. Given: 신규 카테고리 생성
  const originalCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: "자동화테스트-원본-" + RandomGenerator.alphaNumeric(6),
        is_active: true,
        description: "기존 설명",
        parent_id: null,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(originalCategory);

  // 2. When: name, description만 새 값으로 업데이트 (name 유일성 위해 랜덤 부여)
  const newName = "자동화테스트-수정-" + RandomGenerator.alphaNumeric(8);
  const newDescription = "수정설명-" + RandomGenerator.alphabets(12);
  const updated = await api.functional.discussionBoard.admin.categories.update(
    connection,
    {
      categoryId: originalCategory.id,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IDiscussionBoardCategory.IUpdate,
    },
  );
  typia.assert(updated);

  // 3. Then: 변경 필드 확인(name, description)
  TestValidator.equals("이름이 수정된 category 반영됨")(updated.name)(newName);
  TestValidator.equals("설명도 수정됨")(updated.description)(newDescription);
  // 4. Then: 불변 필드(고유 id, parent_id, is_active, created_at) 체크
  TestValidator.equals("category id 불변")(updated.id)(originalCategory.id);
  TestValidator.equals("상위 parent_id 불변")(updated.parent_id)(
    originalCategory.parent_id,
  );
  TestValidator.equals("is_active 불변")(updated.is_active)(
    originalCategory.is_active,
  );
  TestValidator.equals("생성시각(created_at) 불변")(updated.created_at)(
    originalCategory.created_at,
  );
  // 5. Then: updated_at은 실제로 바뀌었는지 체크
  TestValidator.notEquals("updated_at 변경됨")(updated.updated_at)(
    originalCategory.updated_at,
  );
  // 6. 추가: 감사 로그 관련 로직은 별도 API가 없는 경우 skip
}
