import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * 테스트 쓰레드 내 게시물 검색 API에서 잘못된 (schema 미준수) 검색 criteria가 들어갔을 때 오류가 제대로 발생하는지
 * 검증합니다.
 *
 * - 비즈니스 목적: 논의게시판에서 지원하지 않는 검색 필드나 잘못된 타입의 필터가 클라이언트로부터 전달될 때, 서버는 명확한 에러(4xx)로
 *   응답하고, 데이터 훼손이나 잘못된 결과 반환 없이 오류를 리턴해야 합니다.
 * - 이 테스트는 실제 토픽/쓰레드를 생성 후, 허용되지 않은 필드 또는 타입오류 상황 별로 PATCH
 *   /discussionBoard/member/threads/{threadId}/posts 호출 시도 → 에러 반환 여부를 검증합니다.
 *
 * [검증 단계]
 *
 * 1. 올바른 토픽 생성
 * 2. 해당 토픽 하위에 쓰레드 생성
 * 3. (케이스1) 스키마에 없는 임의 필드 포함된 검색 criteria 전달 후, 오류 발생(expect error)
 * 4. (케이스2) 타입이 맞지 않는 값(threadId에 숫자 등) 전달 후, 오류 발생(expect error)
 */
export async function test_api_discussionBoard_test_search_posts_in_thread_with_invalid_criteria(
  connection: api.IConnection,
) {
  // 1. 유효한 토픽 생성
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(10),
        description: RandomGenerator.alphabets(20),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 2. 해당 토픽 하위에 쓰레드 생성
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphabets(10),
        },
      },
    );
  typia.assert(thread);

  // 3. 허용되지 않은 필드 포함 → 오류 기대
  await TestValidator.error("스키마에 없는 필드가 포함될 때 오류 발생 예상")(
    () =>
      api.functional.discussionBoard.member.threads.posts.search(connection, {
        threadId: thread.id,
        // 'IDiscussionBoardPost.IRequest'에는 없는 임의의 프로퍼티 전달:
        body: {
          fooBarXXX: "something",
        } as any,
      }),
  );

  // 4. 타입 오류 (threadId에 number 등) → 오류 기대
  await TestValidator.error(
    "타입 불일치(threadId에 잘못된 타입) 오류 발생 예상",
  )(() =>
    api.functional.discussionBoard.member.threads.posts.search(connection, {
      threadId: thread.id,
      // threadId의 타입이 잘못 전달됨 (string이 아닌 number)
      body: {
        threadId: 12345,
      } as any,
    }),
  );
}
