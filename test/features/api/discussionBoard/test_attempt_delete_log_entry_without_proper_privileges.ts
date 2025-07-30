import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 인증되지 않은 일반 유저(모더레이터/관리자 권한 없이)로 활동 로그를 삭제 시도할 때 권한 에러가 나는지 확인.
 *
 * 1. 모더레이터 권한으로 활동 로그 생성
 * 2. Connection 객체에서 인증 정보를 제거(혹은 일반 유저 상태 시뮬레이션)
 * 3. 해당 로그 ID로 삭제 요청을 시도(권한 없음)
 * 4. TestValidator.error로 에러(거부) 발생을 확인
 */
export async function test_api_discussionBoard_test_attempt_delete_log_entry_without_proper_privileges(
  connection: api.IConnection,
) {
  // 1. 모더레이터 권한으로 활동 로그 생성
  const log =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
          actor_type: "moderator",
          action_type: "content_deleted",
          action_timestamp: new Date().toISOString(),
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  typia.assert(log);

  // 2. connection 객체에서 인증정보 제거(또는 일반 유저 상태 시뮬레이션)
  if (connection.headers) delete connection.headers.Authorization;

  // 3. 권한 없는 상태로 삭제 요청
  // 4. 반드시 에러 발생해야 함
  await TestValidator.error("권한 없는 유저는 활동 로그를 삭제할 수 없어야 함")(
    async () => {
      await api.functional.discussionBoard.moderator.activityLogs.erase(
        connection,
        { activityLogId: log.id },
      );
    },
  );
}
