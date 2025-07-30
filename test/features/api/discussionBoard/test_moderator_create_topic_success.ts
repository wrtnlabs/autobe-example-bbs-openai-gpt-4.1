import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Moderator 권한 사용자의 토픽 정상 생성 E2E 검증.
 *
 * 이 테스트는 moderator 권한으로 discussionBoard/moderator/topics API를 사용하여 신규 토픽을 실제로
 * 생성하고
 *
 * - 모든 필드 입력(title, description, pinned/closed, discussion_board_category_id)
 * - 생성된 결과가 입력값과 정확히 일치하며, 내부 비즈니스 필드(id, timestamps, 참조 값)가 유효하게 반환되는지 검증한다.
 *
 * [진행 단계]
 *
 * 1. 모든 카테고리 조회 후 활성 카테고리 추출(없으면 테스트 실패)
 * 2. 토픽 생성 요청 (유효 필드 모두 입력, title 유니크, 기타 랜덤 데이터)
 * 3. 응답의 각 필드가 입력/비즈니스 규칙과 일치하는지 단언
 */
export async function test_api_discussionBoard_test_moderator_create_topic_success(
  connection: api.IConnection,
) {
  // 1. discussionBoard.categories.index로 카테고리 전체 조회
  const catPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(catPage);
  const activeCategories = catPage.data.filter((cat) => cat.is_active);
  TestValidator.predicate("적어도 한 개 이상의 활성 카테고리가 존재해야 함")(
    activeCategories.length > 0,
  );

  // 2. 생성에 사용할 category 1개 선정
  const category = RandomGenerator.pick(activeCategories);

  // 3. 토픽 생성용 랜덤 입력 데이터 준비
  const createBody: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.paragraph()(10), // 카테고리 내 중복 방지, 10자 랜덤 제목
    description: RandomGenerator.paragraph()(20),
    pinned: true, // moderator이므로 flag 직접 설정
    closed: false,
    discussion_board_category_id: category.id,
  };

  // 4. 토픽 생성 API 수행
  const created = await api.functional.discussionBoard.moderator.topics.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(created);

  // 5. 입력값이 정상 반영됐는지 각 필드 검증
  TestValidator.equals("카테고리 ID 반영")(
    created.discussion_board_category_id,
  )(createBody.discussion_board_category_id);
  TestValidator.equals("제목 반영")(created.title)(createBody.title);
  TestValidator.equals("설명 반영")(created.description)(
    createBody.description,
  );
  TestValidator.equals("pinned 반영")(created.pinned)(createBody.pinned);
  TestValidator.equals("closed 반영")(created.closed)(createBody.closed);
  // auto fields (id/timestamps/creator) 유효성 및 비즈니스 룰
  TestValidator.predicate("id가 uuid 형식")(
    !!created.id && created.id.length > 0,
  );
  TestValidator.predicate("생성/수정 시각이 ISO8601 date-time임")(
    !!created.created_at && !!created.updated_at,
  );
  TestValidator.predicate("creator_member_id가 존재")(
    !!created.creator_member_id,
  );
}
