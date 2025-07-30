import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * 같은 카테고리 내 중복된 제목으로 토픽 생성 시도 검증.
 *
 * 관리자가 특정 카테고리에서 동일한 제목의 토픽을 두 번 생성하려는 경우, 두 번째 생성이 유니크 제약 위반으로 거절되는지 확인한다.
 *
 * 주요 흐름:
 *
 * 1. 카테고리 목록 조회 및 활성화된 카테고리 확보
 * 2. 해당 카테고리 내, 무작위 제목으로 토픽 1회 생성(정상)
 * 3. 같은 제목/카테고리로 한 번 더 생성하면 실패(에러 발생 여부만 검증)
 */
export async function test_api_discussionBoard_test_admin_create_topic_with_duplicate_title(
  connection: api.IConnection,
) {
  // 1. 활성 카테고리 조회 (없으면 에러)
  const categories =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categories);
  const category =
    categories.data.find((cat) => cat.is_active === true) ??
    (() => {
      throw new Error("활성화된 게시판 카테고리가 필요합니다.");
    })();

  // 2. 무작위 title로 최초 토픽 생성
  const title = `중복테스트-${RandomGenerator.alphaNumeric(10)}`;
  const topicInput = {
    title,
    description: "중복 타이틀 테스트",
    pinned: false,
    closed: false,
    discussion_board_category_id: category.id,
  } satisfies IDiscussionBoardTopics.ICreate;

  const created = await api.functional.discussionBoard.admin.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(created);
  TestValidator.equals("title 일치")(created.title)(title);
  TestValidator.equals("category 일치")(created.discussion_board_category_id)(
    category.id,
  );

  // 3. 동일 title/카테고리로 재생성 시도 → 에러(expected)
  await TestValidator.error(
    "동일 제목, 동일 카테고리로 생성 시도시 실패하도록 보장할 것",
  )(async () => {
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: topicInput,
    });
  });
}
