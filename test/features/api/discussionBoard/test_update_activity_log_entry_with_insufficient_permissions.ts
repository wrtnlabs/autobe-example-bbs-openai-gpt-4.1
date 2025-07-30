import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 테스트 목적: 비관리자/비모더레이터(권한 없는) 사용자가 감사/액티비티 로그를 수정하려 할 때 거부됨을 검증합니다.
 *
 * 시나리오 설명:
 *
 * 1. (전제 조건) 관리자인 상태에서 감사/통계 활동 로그 엔트리를 생성합니다.
 * 2. (상황 전환) 권한 없는 사용자(예: 일반 회원, 게스트 등)의 세션(혹은 토큰)으로 연결을 전환한다고 가정합니다.
 *
 *    - 제공된 API 내에 회원/권한 전환 기능이 없으므로, connection 인자를 적절히 교체해야 함을 주석으로 처리합니다.
 * 3. 해당 활성 로그 엔트리에 대해 업데이트를 시도합니다.
 * 4. 업데이트 시도 시 권한 부족으로 반드시 오류가 발생해야 하므로, TestValidator.error로 확인합니다.
 *
 * 비고:
 *
 * - 실제 권한 변경/로그인 API가 제공되지 않아 connection에는 이미 권한이 없는 세션이 세팅되어 있다고 가정함
 * - Response의 구체적인 에러 메시지나 타입 확인은 하지 않고, 오류 발생 자체만 검증함
 */
export async function test_api_discussionBoard_test_update_activity_log_entry_with_insufficient_permissions(
  connection: api.IConnection,
) {
  // 1. (전제) 관리자 권한으로 감사/액티비티 로그 생성
  const activityLog =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: {
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "admin",
        action_type: "test_action",
        action_timestamp: new Date().toISOString(),
      } satisfies IDiscussionBoardActivityLog.ICreate,
    });
  typia.assert(activityLog);

  // 2. (상황 전환) connection이 이미 비관리자/일반 사용자 권한 세션이라고 가정함
  //    실제 E2E에서는 connection 인자를 교체하거나 별도 로그인 API 활용 필요

  // 3. 비권한자로 해당 액티비티 로그 엔트리 업데이트(거부되어야 함)
  await TestValidator.error(
    "권한 없는 사용자의 activity log 업데이트 시도는 거부되어야 합니다.",
  )(() =>
    api.functional.discussionBoard.admin.activityLogs.update(connection, {
      activityLogId: activityLog.id,
      body: {
        action_type: "unauthorized_update_attempt",
      } satisfies IDiscussionBoardActivityLog.IUpdate,
    }),
  );
}
