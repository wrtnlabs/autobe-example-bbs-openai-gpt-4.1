import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IPageIDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopics";

/**
 * 토론 게시글(Discussion Board Topic) 검색 필터의 "결과 없음"(no matches) 안전성 테스트
 *
 * 검색 필터(타이틀, 카테고리, 날짜 등)를 논리적으로 병합하여 실제로 매칭되는 토픽이 하나도 없도록 보장하고, 이 경우 API가 빈
 * 배열([])과 정상적인 pagination 메타데이터 전달로 에러 없이 gracefully 대응함을 검증.
 *
 * **비즈니스 배경**:
 *
 * - 실제 운영 환경에서 사용자가 잘못된 키워드, 미래 시점 등으로 검색 시 정상적으로 "검색결과 없음"을 표시해야 하며,
 * - 시스템이 빈 검색 결과에 대해 에러 없이 우아하게 대응해야 한다.
 *
 * **시나리오 흐름**:
 *
 * 1. (의존성) 실제 존재하는 discussion board 카테고리 목록을 조회해 필터 후보 category_id 확보
 * 2. 일부러 존재하지 않을 title, 미래의 created_from/created_to 조합하여, 의도적으로 매칭되는 토픽이 없도록 함
 * 3. PATCH /discussionBoard/topics 엔드포인트로 복합 필터 검색 실행
 * 4. 결과 배열(data)이 빈 배열([])임을 검증, pagination 객체가 정상 스키마 제공됨 확인
 * 5. Pagination current/page/limit 등 페이징 메타데이터 정상값임을 추가 검증
 */
export async function test_api_discussionBoard_test_search_topics_with_no_matches(
  connection: api.IConnection,
) {
  // 1. 실제 운영 카테고리 목록 확보 (필터용)
  const categoryPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoryPage);
  const categories = categoryPage.data;

  // 2. (필터) 실제 존재하는 카테고리 id + 절대 매칭 안되는 title, date 값 병합
  const categoryId = categories.length > 0 ? categories[0].id : null;
  const impossibleTitle = `test_e2e_no_match_title_${Date.now()}`;
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1년 후 날짜

  const requestBody = {
    category_id: categoryId,
    title: impossibleTitle,
    created_from: futureDate,
    created_to: futureDate,
    limit: 10,
    page: 1,
    sort: "created_at",
    order: "asc",
  } satisfies IDiscussionBoardTopics.IRequest;

  // 3. PATCH /discussionBoard/topics 복합 필터 검색 수행
  const result = await api.functional.discussionBoard.topics.search(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert(result);

  // 4. 검색결과 빈 배열([]), pagination 스키마 및 값 검증
  TestValidator.equals("검색 결과 없음 (빈 배열)")(result.data.length)(0);
  TestValidator.predicate("pagination 객체 존재 및 올바름")(
    !!result.pagination,
  );
  TestValidator.equals("pagination current page")(result.pagination.current)(1);
  TestValidator.equals("pagination limit")(result.pagination.limit)(10);
}
