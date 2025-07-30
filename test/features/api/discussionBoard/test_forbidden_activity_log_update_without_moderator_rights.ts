import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 활동 로그 레코드 권한 업데이트 제한(RBAC) 테스트
 *
 * - 목적: 비모더레이터/비관리자(권한 없는 계정)가 활동 로그 레코드(ID 기준)을 임의 수정하려 하면, 시스템이 올바르게 거부(권한
 *   불충분)하는지 검증한다.
 *
 * 1. 모더레이터 권한으로 활동 로그 레코드 하나 생성 (테스트 사전조건용)
 * 2. 별도의 권한 없는 커넥션(예: headers 비움, 일반회원 등)으로 전환
 * 3. Update(수정) 요청 시도 → 거부 예외/에러 발생(assert)
 */
export async function test_api_discussionBoard_test_forbidden_activity_log_update_without_moderator_rights(
  connection: api.IConnection,
) {
  // 1. 모더레이터 권한으로 활동 로그 생성
  const moderatorActorId: string = typia.random<string & tags.Format<"uuid">>();
  const activityLog =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: {
          actor_id: moderatorActorId,
          actor_type: "moderator",
          action_type: "edit_post",
          action_timestamp: new Date().toISOString(),
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  typia.assert(activityLog);

  // 2. 권한 없는 계정(토큰 미포함) 환경 커넥션 준비 (headers 삭제)
  const noAuthConnection: api.IConnection = { ...connection, headers: {} };
  const updateInput: IDiscussionBoardActivityLog.IUpdate = {
    actor_type: "member",
    action_type: "unauthorized_attempt",
    action_timestamp: new Date().toISOString(),
  };

  // 3. update 시도 시, 권한 에러/예외 발생 검증
  await TestValidator.error("member/non-privileged cannot update activity log")(
    () =>
      api.functional.discussionBoard.moderator.activityLogs.update(
        noAuthConnection,
        {
          activityLogId: activityLog.id,
          body: updateInput,
        },
      ),
  );
}
