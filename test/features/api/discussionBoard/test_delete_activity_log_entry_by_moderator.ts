import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 모더레이터 권한의 사용자가 활동 로그 항목을 삭제하는 기능을 검증합니다.
 *
 * - 활동 로그 삭제는 모더레이터 이상의 권한에서만 허용됩니다.
 * - 삭제 성공 시 해당 activityLogId는 더 이상 조회/삭제가 불가해야 하며, 시스템 차원의 감사 트레일 기록이 남는 것이
 *   원칙입니다. (단, 관련 추가 API 미제공 시 해당 부분은 생략)
 *
 * 테스트 플로우:
 *
 * 1. 모더레이터 자격으로 activity log entry를 생성합니다.
 * 2. 생성된 activityLogId로 삭제 API를 호출하여 실제 삭제 가능함을 검증합니다.
 * 3. 동일 ID로 다시 삭제 요청 시 에러(존재하지 않음 등) 발생 확인.
 * 4. 모더레이터 외 권한에서 삭제가 거부되는지 검증하고 싶으나, 권한 전환 관련 인증 API가 제공되지 않아 생략합니다.
 */
export async function test_api_discussionBoard_test_delete_activity_log_entry_by_moderator(
  connection: api.IConnection,
) {
  // 1. 모더레이터 권한으로 활동 로그 생성
  const activityLog: IDiscussionBoardActivityLog =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
          topic_id: null,
          thread_id: null,
          post_id: null,
          actor_type: "moderator",
          action_type: "moderation_action",
          action_timestamp: new Date().toISOString(),
          ip_address: "127.0.0.1",
          user_agent: "e2e-test-agent",
          metadata_json: null,
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  typia.assert(activityLog);

  // 2. 해당 로그 ID로 삭제 요청
  await api.functional.discussionBoard.moderator.activityLogs.erase(
    connection,
    {
      activityLogId: activityLog.id,
    },
  );

  // 3. 삭제한 로그를 같은 ID로 재삭제 시 에러 발생(이미 삭제되거나 존재 불가)
  await TestValidator.error("이미 삭제된 로그 재삭제는 에러이어야 함")(() =>
    api.functional.discussionBoard.moderator.activityLogs.erase(connection, {
      activityLogId: activityLog.id,
    }),
  );

  // 4. (권한 전환/일반 유저 접근 등은 별도 인증/전환 API가 api 자료에 포함될 경우 구현 가능, 미제공 상태이므로 생략)
}
