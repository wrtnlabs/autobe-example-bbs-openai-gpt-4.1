import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * 특정 토픽 내 개별 스레드 상세정보 조회 성공 케이스 확인
 *
 * - 주어진 토픽 하에서 신규 스레드를 생성하고, 해당 토픽/스레드 식별자로 상세조회 API 호출
 * - 반환되는 thread 세부 정보가 생성시점 값과 모두 일치하는지 검증
 * - 토픽 연관성, 생성자 정보 등 관계 필드의 연결까지 함께 확인 (토픽 자체 생성 API는 없으므로 topicId는 random 값 활용)
 *
 * 절차:
 *
 * 1. 임의의 topicId(uuid) 생성
 * 2. TopicId 하에 thread 생성(권한 필요)
 * 3. 생성 결과의 threadId로 상세조회 호출
 * 4. 조회 결과와 생성시점 thread 정보가 완벽히 일치하는지 assertion
 * 5. 관계 필드(토픽 id, creator id 등)도 값/타입 검증
 */
export async function test_api_discussionBoard_test_get_thread_detail_success(
  connection: api.IConnection,
) {
  // 1. 임의의 topicId(uuid) 준비
  const topicId = typia.random<string & tags.Format<"uuid">>();

  // 2. topicId 하에 thread 생성
  const threadCreateInput: IDiscussionBoardThreads.ICreate = {
    title: `Test Thread Title ${RandomGenerator.alphaNumeric(10)}`,
  };
  const createdThread: IDiscussionBoardThreads =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topicId,
        body: threadCreateInput,
      },
    );
  typia.assert(createdThread);

  // 3. 해당 토픽/스레드 id로 상세조회 호출
  const threadDetail: IDiscussionBoardThreads =
    await api.functional.discussionBoard.topics.threads.at(connection, {
      topicId: topicId,
      threadId: createdThread.id,
    });
  typia.assert(threadDetail);

  // 4. 생성정보와 상세조회 정보가 완전히 동일한지 검증
  TestValidator.equals("스레드 고유 ID")(threadDetail.id)(createdThread.id);
  TestValidator.equals("타이틀 일치")(threadDetail.title)(
    threadCreateInput.title,
  );
  TestValidator.equals("토픽 ID 일치")(threadDetail.discussion_board_topic_id)(
    topicId,
  );
  TestValidator.equals("생성자 ID 일치")(threadDetail.creator_member_id)(
    createdThread.creator_member_id,
  );
}
