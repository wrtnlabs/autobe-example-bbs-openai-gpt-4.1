import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * 관리자 계정이 모든 필수 및 선택 필드를 채워 새 토픽을 정상적으로 생성할 수 있는지 검증한다.
 *
 * 1. 토픽에 할당할 활성화된 discussion_board_category_id 값을 얻기 위해 카테고리 목록을 조회한다.
 * 2. 활성화된 카테고리 중 하나를 선정한다.
 * 3. 고유한 제목(title), 설명(description), pinned/closed 플래그 등 모든 필드로 토픽 생성 API를 호출한다.
 * 4. 응답에서 각 필드 값이 요청과 동일하고, id/생성자/타임스탬프/카테고리 등 추가 정보도 적합한지 cross-check 한다.
 * 5. Title 중복, inactive category 등 예외 상황은 본 시나리오에서 제외.
 *
 * 활성화된 카테고리가 없을 경우 테스트를 중단.
 */
export async function test_api_discussionBoard_test_admin_create_topic_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 카테고리 목록 조회 및 활성화 필터링
  const categoriesPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoriesPage);

  const actives = categoriesPage.data.filter((cat) => cat.is_active);
  if (actives.length === 0)
    throw new Error(
      "활성화된 카테고리가 하나도 없습니다. 본 테스트를 위한 카테고리 데이터 사전 생성 필요.",
    );
  const category = RandomGenerator.pick(actives);

  // 2. 임의의 유니크 title 및 description, 옵션값 정의
  const title = RandomGenerator.alphabets(16) + "-" + Date.now();
  const description = RandomGenerator.paragraph()();
  const pinned = true;
  const closed = false;
  const categoryId = category.id;

  // 3. 토픽 생성
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title,
        description,
        pinned,
        closed,
        discussion_board_category_id: categoryId,
      },
    },
  );
  typia.assert(topic);

  // 4. 생성 결과 cross-check
  TestValidator.equals("제목")(topic.title)(title);
  TestValidator.equals("설명")(topic.description)(description);
  TestValidator.equals("pinned")(topic.pinned)(pinned);
  TestValidator.equals("closed")(topic.closed)(closed);
  TestValidator.equals("카테고리ID")(topic.discussion_board_category_id)(
    categoryId,
  );
  TestValidator.equals("id uuid 형식")(
    typia.is<string & tags.Format<"uuid">>(topic.id),
  )(true);
  TestValidator.equals("생성/수정시각 ISO8601")(
    typia.is<string & tags.Format<"date-time">>(topic.created_at) &&
      typia.is<string & tags.Format<"date-time">>(topic.updated_at),
  )(true);
  TestValidator.equals("생성/수정시각 동일")(topic.created_at)(
    topic.updated_at,
  );
  TestValidator.predicate("creator_member_id uuid 형식")(
    typia.is<string & tags.Format<"uuid">>(topic.creator_member_id),
  );
}
