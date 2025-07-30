import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate topic creation with full and correct data.
 *
 * 이 테스트는 활성화된 카테고리 하위에 모든 필수 및 옵션 필드(제목, 설명, 카테고리, 플래그)를 올바른 값으로 제공할 때 사용자가 새로운
 * 토론 주제를 성공적으로 생성할 수 있음을 검증합니다. 생성 응답에 입력한 값들이 정확히 반영되는지 (title, description,
 * flag, category), 자동 생성 데이터(id, 작성/수정시각, 생성자 id 등)가 모두 포함되는지 검증합니다.
 *
 * 1. 게시판 카테고리 목록을 조회 후, is_active=true인 카테고리를 선택합니다.
 * 2. 고유한 제목(title) 및 적절한 설명/플래그/카테고리 조합으로 토픽 생성 요청을 보냅니다.
 * 3. 응답 객체에 대해 입력 값이 정확히 반영되었는지, 자동 생성된 metadata가 정상적으로 포함되었는지 검증합니다.
 *
 * 비즈니스 규칙:
 *
 * - 카테고리 활성화 상태 필요, 제목 중복 방지(고유성 보장), creator_member_id는 접속 토큰 컨텍스트에서 자동 주입
 */
export async function test_api_discussionBoard_test_create_topic_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 카테고리 목록 조회 및 활성 카테고리 선택
  const categories =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categories);
  const category = categories.data.find((c) => c.is_active === true);
  if (!category) throw new Error("테스트용 활성화된 카테고리가 없습니다.");

  // 2. 고유 타이틀로 토픽 생성
  const uniqueTitle = `[E2E] Topic Creation ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const requestBody = {
    title: uniqueTitle,
    description: "E2E 통합테스트를 위한 토론주제.",
    pinned: false,
    closed: false,
    discussion_board_category_id: category.id,
  } satisfies IDiscussionBoardTopics.ICreate;
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: requestBody },
  );
  typia.assert(topic);

  // 3. 입력값 및 metadata 검증
  TestValidator.equals("title matches")(topic.title)(requestBody.title);
  TestValidator.equals("description matches")(topic.description)(
    requestBody.description,
  );
  TestValidator.equals("flag: pinned")(topic.pinned)(requestBody.pinned);
  TestValidator.equals("flag: closed")(topic.closed)(requestBody.closed);
  TestValidator.equals("category matches")(topic.discussion_board_category_id)(
    requestBody.discussion_board_category_id,
  );
  TestValidator.predicate("topic id is UUID")(
    typeof topic.id === "string" && /^[0-9a-fA-F-]{36}$/.test(topic.id),
  );
  TestValidator.predicate("creator member id is UUID")(
    typeof topic.creator_member_id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(topic.creator_member_id),
  );
  TestValidator.predicate("created_at is ISO date")(
    typeof topic.created_at === "string" &&
      !isNaN(Date.parse(topic.created_at)),
  );
  TestValidator.predicate("updated_at is ISO date")(
    typeof topic.updated_at === "string" &&
      !isNaN(Date.parse(topic.updated_at)),
  );
}
