import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * 이미 존재하는 태그와 이름이 중복되게 태그를 수정할 경우 충돌 에러가 발생해야 함을 검증합니다.
 *
 * - 태그의 name은 시스템 내에서 유일해야 하며,
 *   관리자/운영자가 고유성 정책 위배로 인해 동일한 이름으로 업데이트를 시도하면 실패해야 합니다.
 *
 * [테스트 시나리오]
 * 1. "unique-tag-name-1"으로 첫 번째 태그를 생성한다.
 * 2. "unique-tag-name-2"로 두 번째 태그를 생성한다.
 * 3. 두 번째 태그의 이름을 첫 번째 태그의 이름("unique-tag-name-1")으로 수정하려 시도한다.
 * 4. 이 과정에서 name 고유성 정책 위반(conflict error)이 발생하는지 확인한다.
 */
export async function test_api_discussionBoard_test_update_tag_with_duplicate_name_should_fail(
  connection: api.IConnection,
) {
  // 1. 첫 번째 태그 생성
  const tagName1 = `e2e-duplicate-tag-1-${RandomGenerator.alphabets(8)}`;
  const tag1 = await api.functional.discussionBoard.tags.post(connection, {
    body: {
      name: tagName1,
      description: "첫 번째 고유 태그",
    } satisfies IDiscussionBoardTag.ICreate,
  });
  typia.assert(tag1);
  TestValidator.equals("tag name is correct")(tag1.name)(tagName1);

  // 2. 두 번째 태그 생성
  const tagName2 = `e2e-duplicate-tag-2-${RandomGenerator.alphabets(8)}`;
  const tag2 = await api.functional.discussionBoard.tags.post(connection, {
    body: {
      name: tagName2,
      description: "두 번째 고유 태그",
    } satisfies IDiscussionBoardTag.ICreate,
  });
  typia.assert(tag2);
  TestValidator.equals("tag name is correct")(tag2.name)(tagName2);

  // 3. 두 번째 태그를 첫 번째 태그 이름으로 수정(중복 시도)
  await TestValidator.error("태그 이름 중복 시 충돌 에러가 발생해야 함.")(async () => {
    await api.functional.discussionBoard.tags.putById(connection, {
      id: tag2.id,
      body: {
        name: tagName1,
      } satisfies IDiscussionBoardTag.IUpdate,
    });
  });
}