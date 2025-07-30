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
 * 스레드 내 게시물 페이지네이션 검색 기능 검증 테스트
 *
 * 이 테스트는 스레드 내의 게시물 검색 API에서 페이지네이션 파라미터 및 전체 게시물 수, 페이지 수, 실제 반환되는 게시글 집합이
 * 올바르게 동작하는지 확인하기 위한 것입니다.
 *
 * ### 절차
 *
 * 1. 새 토픽을 생성한다.
 * 2. 해당 토픽에 스레드를 생성한다.
 * 3. 충분한 수의 게시물(15개)을 생성한다.
 * 4. 첫 페이지(limit=10, page=1)에서 페이지네이션 검색 및 결과/정렬 검증
 * 5. 두 번째 페이지(limit=10, page=2)에서 결과/정렬 검증
 * 6. 전체 게시물의 중복·누락 여부(원본 ID 기준) 검증
 *
 * 정상 반환뿐 아니라 모든 페이지네이션 값, 전체 카운트, 중복/누락 없는 전체 반환 등을 꼼꼼히 점검함
 */
export async function test_api_discussionBoard_test_search_posts_in_thread_with_pagination(
  connection: api.IConnection,
) {
  // 1. 새 토픽 생성
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 2. 새 스레드 생성
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphabets(12),
        },
      },
    );
  typia.assert(thread);

  // 3. 충분한 게시물(15개) 생성
  const postBodies: string[] = ArrayUtil.repeat(15)(() =>
    RandomGenerator.paragraph()(),
  );
  const postIds: string[] = [];
  for (const body of postBodies) {
    const post =
      await api.functional.discussionBoard.member.threads.posts.create(
        connection,
        {
          threadId: thread.id,
          body: {
            discussion_board_thread_id: thread.id,
            body: body,
          },
        },
      );
    typia.assert(post);
    postIds.push(post.id);
  }

  // 4. 첫 페이지 (limit=10, page=1) 검색
  const page1 =
    await api.functional.discussionBoard.member.threads.posts.search(
      connection,
      {
        threadId: thread.id,
        body: {
          threadId: thread.id,
          pagination: {
            page: 1,
            limit: 10,
          },
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("첫 페이지 게시글 수")(page1.data.length)(10);
  TestValidator.equals("페이지네이션 현재 페이지")(page1.pagination.current)(1);
  TestValidator.equals("페이지네이션 페이지당 수")(page1.pagination.limit)(10);
  TestValidator.equals("총 게시글 수")(page1.pagination.records)(15);
  TestValidator.equals("총 페이지 수")(page1.pagination.pages)(2);
  // 정렬 검증(생성 시점 기준 최신순 내림차순 가정)
  const createdAtsPage1 = page1.data.map((p) => p.created_at);
  for (let i = 1; i < createdAtsPage1.length; ++i)
    TestValidator.predicate("created_at 최신순 내림차순")(
      createdAtsPage1[i - 1] >= createdAtsPage1[i],
    );

  // 5. 두 번째 페이지 (limit=10, page=2)
  const page2 =
    await api.functional.discussionBoard.member.threads.posts.search(
      connection,
      {
        threadId: thread.id,
        body: {
          threadId: thread.id,
          pagination: {
            page: 2,
            limit: 10,
          },
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("두 번째 페이지 게시글 수")(page2.data.length)(5);
  TestValidator.equals("페이지네이션 현재 페이지")(page2.pagination.current)(2);
  // 6. 전체 반환 데이터(15개) 중복·누락 없는지, 원본 생성 ID 모두 포함하는지 검증
  const allPostIds = [...page1.data, ...page2.data].map((p) => p.id);
  TestValidator.equals("전체 게시글 중복/누락 없음")(new Set(allPostIds).size)(
    15,
  );
  for (const id of postIds)
    TestValidator.predicate("생성한 게시글 반환 포함")(allPostIds.includes(id));
}
