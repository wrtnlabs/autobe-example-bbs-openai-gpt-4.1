import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 활동 로그 단일 상세 조회: 모더레이터 역할 권한 테스트 및 정상/실패 케이스
 *
 * 1. 모더레이터 권한으로 활동 로그를 신규 생성(create)한다.
 * 2. 생성된 활동 로그의 id(activityLogId)를 활용하여 모더레이터 API로 상세 조회를 수행한다.
 *
 *    - 모든 필드가 누락없이, 정확한 값으로 반환되는지 검증한다.
 * 3. 모더레이터가 아닌 상태(Authorization 헤더 없음)로 로그 상세 조회를 시도할 경우 접근이 거부됨을 검증한다.
 * 4. 존재하지 않는 임의의 activityLogId(uuid)로 접근 시 "찾을 수 없음"(not found) 에러가 반환되는지 검증한다.
 */
export async function test_api_discussionBoard_test_get_activity_log_by_id_moderator_success_and_access_control(
  connection: api.IConnection,
) {
  // 1. 모더레이터 권한으로 활동 로그 생성
  const createInput: IDiscussionBoardActivityLog.ICreate = {
    ...typia.random<IDiscussionBoardActivityLog.ICreate>(),
    actor_type: "moderator",
    action_type: "moderation_action",
    action_timestamp: new Date().toISOString() as string &
      tags.Format<"date-time">,
    metadata_json: JSON.stringify({ reason: "moderator test log" }),
  };
  const activityLog: IDiscussionBoardActivityLog =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      { body: createInput },
    );
  typia.assert(activityLog);

  // 2. 생성된 로그의 id로, 모더레이터 API 상세 조회 성공
  const fetched: IDiscussionBoardActivityLog =
    await api.functional.discussionBoard.moderator.activityLogs.at(connection, {
      activityLogId: activityLog.id,
    });
  typia.assert(fetched);
  TestValidator.equals("activity log detail matches")(fetched)(activityLog);

  // 3. (비모더레이터/비인가) 권한: Authorization 제거하여 상세 조회 실패 검증
  const nonModeratorConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete nonModeratorConnection.headers["Authorization"];
  await TestValidator.error("non-moderator cannot fetch log detail")(
    async () => {
      await api.functional.discussionBoard.moderator.activityLogs.at(
        nonModeratorConnection,
        { activityLogId: activityLog.id },
      );
    },
  );

  // 4. 존재하지 않는 activityLogId로 접근(에러 검증)
  await TestValidator.error("not found for invalid activityLogId")(async () => {
    await api.functional.discussionBoard.moderator.activityLogs.at(connection, {
      activityLogId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
