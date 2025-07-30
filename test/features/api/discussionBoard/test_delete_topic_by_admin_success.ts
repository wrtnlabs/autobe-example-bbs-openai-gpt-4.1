import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * 어드민이 토픽을 하드 딜리트(영구 삭제)하는 정상 케이스 E2E 검증
 *
 * - 게시판 멤버, 어드민, 카테고리, 토픽 등 모든 테스트 종속 데이터를 직접 생성
 * - 어드민 계정으로 토픽 DELETE 후 실제로 완전히 제거되는지 확인
 * - (후속 delete 시 not found 확인: 오퍼레이션별 상세조회 API 없으므로 반복 delete로 검증)
 *
 * 테스트 시나리오
 *
 * 1. Member 계정 신규 생성
 * 2. 어드민 계정 신규 등록 (서로 다른 user_identifier)
 * 3. 카테고리 신규 생성(활성 상태)
 * 4. 위 member와 카테고리 id로 토픽 생성
 * 5. Admin 권한으로 해당 토픽 DELETE
 * 6. 삭제 후 동일 토픽 id로 다시 DELETE → not found (존재 불가)
 */
export async function test_api_discussionBoard_test_delete_topic_by_admin_success(
  connection: api.IConnection,
) {
  // 1. 신규 member 생성
  const memberUserId = RandomGenerator.alphaNumeric(16);
  const memberJoinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserId,
        joined_at: memberJoinTime,
      },
    },
  );
  typia.assert(member);

  // 2. 어드민 계정 생성
  const adminUserId = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserId,
        granted_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(admin);

  // 3. 카테고리 신규 생성 (이름 유일, 활성화)
  const categoryName = RandomGenerator.alphaNumeric(16);
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // 4. 토픽 생성 (member가 생성자로, 위 카테고리 id)
  const topicTitle = RandomGenerator.alphaNumeric(24);
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topic);

  // 5. admin 권한으로 topic hard delete
  await api.functional.discussionBoard.admin.topics.erase(connection, {
    topicId: topic.id,
  });

  // 6. 삭제된 토픽 ID로 재 delete 시 not found 등 오류 반드시 발생해야 함
  await TestValidator.error("topic not found after delete")(
    async () =>
      await api.functional.discussionBoard.admin.topics.erase(connection, {
        topicId: topic.id,
      }),
  );
}
