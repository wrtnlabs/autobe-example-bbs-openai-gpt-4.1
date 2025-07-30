import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 관리자가 활동 로그(activity log)를 성공적으로 삭제하는 케이스를 검증합니다.
 *
 * - 감사용/분석용 활동 로그가 하드 딜리트로 정상 삭제되는지 확인합니다.
 * - 삭제 이후 동일 로그를 재삭제할 경우 not-found 등 비정상 에러가 발생해야 합니다.
 * - 삭제된 로그의 별도 재조회용 API 및 삭제 작업 자체의 감사 기록 확인 API는 부재하므로 해당 경로는 생략합니다.
 *
 * 절차:
 *
 * 1. 활동 로그를 1건 생성하여 activityLogId 확보
 * 2. 생성된 로그의 주요 값이 정확한지 확인
 * 3. 해당 로그를 DELETE 요청으로 삭제
 * 4. 재삭제 시도시 오류가 발생하는지(실제 hard-delete) 검증
 */
export async function test_api_discussionBoard_admin_activityLogs_test_delete_activity_log_successfully_by_admin(
  connection: api.IConnection,
) {
  // 1. 활동 로그 엔트리 1건 생성 (의존 dependency)
  const logCreateInput: IDiscussionBoardActivityLog.ICreate = {
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    actor_type: "admin",
    action_type: "moderation_action",
    action_timestamp: new Date().toISOString(),
    topic_id: typia.random<string & tags.Format<"uuid">>(),
    thread_id: null,
    post_id: null,
    ip_address: "203.0.113.10",
    user_agent: "Mozilla/5.0 (compatible; TestBot/1.0)",
    metadata_json: JSON.stringify({ manualTest: true }),
  };
  const createdLog =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: logCreateInput,
    });
  typia.assert(createdLog);

  // 2. 로그 생성 결과 주요 필드 검증
  TestValidator.equals("생성된 actor_id 일치")(createdLog.actor_id)(
    logCreateInput.actor_id,
  );
  TestValidator.equals("역할이 admin")(createdLog.actor_type)("admin");

  // 3. 생성된 로그 삭제
  await api.functional.discussionBoard.admin.activityLogs.erase(connection, {
    activityLogId: createdLog.id,
  });

  // 4. hard-delete 검증: 동일 로그 재삭제 시 오류 발생해야 함
  await TestValidator.error("재삭제하면 not-found 등 예외")(async () => {
    await api.functional.discussionBoard.admin.activityLogs.erase(connection, {
      activityLogId: createdLog.id,
    });
  });
}
