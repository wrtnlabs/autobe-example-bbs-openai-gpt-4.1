import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * 관리자가 새로운 게시판 카테고리를 생성(최상위, 하위 계층 포함)하는 정상 흐름 테스트
 *
 * 이 테스트는:
 *
 * - Parent_id가 null인 최상위 카테고리를 먼저 생성
 * - 그 id를 parent_id로 넣어 하위 카테고리도 생성(트리구조)
 * - 반환된 각 객체의 값/구조 일치, 필드별 타입, 계층관계(parent-child) 검증
 * - Created_at/updated_at이 올바른 ISO 형식 및 id 중복 없음 등 추가 체크 (감사 로그/API 미제공시 별도 감사
 *   이벤트 검증은 생략)
 *
 * 1. 최상위 카테고리 생성(name 유일/랜덤, parent_id null, is_active, description)
 * 2. 생성된 id로 하위 카테고리 생성 (parent_id 연결, 동일 필드 validation)
 * 3. 각 응답값(field, 계층, 타입) 및 id구분, 생성일시 등 검증
 */
export async function test_api_discussionBoard_test_create_new_category_with_valid_data_and_optional_parent(
  connection: api.IConnection,
) {
  // 1. 최상위(parent) 카테고리 생성
  const parent_name = `${RandomGenerator.alphabets(8)}-parent`;
  const parent_description = RandomGenerator.paragraph()();
  const parent_is_active = Math.random() > 0.5;
  const parentCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: parent_name,
        description: parent_description,
        parent_id: null,
        is_active: parent_is_active,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(parentCategory);
  TestValidator.equals("parent name")(parentCategory.name)(parent_name);
  TestValidator.equals("parent description")(parentCategory.description)(
    parent_description,
  );
  TestValidator.equals("parent is_active")(parentCategory.is_active)(
    parent_is_active,
  );
  TestValidator.equals("parent id is null")(parentCategory.parent_id)(null);

  // 2. 하위(child) 카테고리 생성
  const child_name = `${RandomGenerator.alphabets(8)}-child`;
  const child_description = RandomGenerator.paragraph()();
  const child_is_active = Math.random() > 0.5;
  const childCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: child_name,
        description: child_description,
        parent_id: parentCategory.id,
        is_active: child_is_active,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(childCategory);
  TestValidator.equals("child name")(childCategory.name)(child_name);
  TestValidator.equals("child description")(childCategory.description)(
    child_description,
  );
  TestValidator.equals("child is_active")(childCategory.is_active)(
    child_is_active,
  );
  TestValidator.equals("child parent_id matches")(childCategory.parent_id)(
    parentCategory.id,
  );

  // 3. id, created_at, updated_at(ISO8601), id uniqueness 등 추가 체크
  TestValidator.notEquals("parent/child id must differ")(childCategory.id)(
    parentCategory.id,
  );
  TestValidator.predicate("parent id format")(
    typeof parentCategory.id === "string" && parentCategory.id.length > 0,
  );
  TestValidator.predicate("child id format")(
    typeof childCategory.id === "string" && childCategory.id.length > 0,
  );
  TestValidator.predicate("parent created_at ISO")(
    !!Date.parse(parentCategory.created_at),
  );
  TestValidator.predicate("parent updated_at ISO")(
    !!Date.parse(parentCategory.updated_at),
  );
  TestValidator.predicate("child created_at ISO")(
    !!Date.parse(childCategory.created_at),
  );
  TestValidator.predicate("child updated_at ISO")(
    !!Date.parse(childCategory.updated_at),
  );

  // 감사 로그 검증 API 미제공이므로 감사 이벤트 실제 확인은 생략
}
