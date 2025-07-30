import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 활동 로그 단건 상세 조회(관리자 권한)
 *
 * - 관리자는 활동 로그의 단일 상세 정보를 activityLogId를 통해 조회할 수 있다.
 * - 이 테스트는 생성된 로그의 모든 속성이 상세 조회 결과와 정확히 일치함을 검증한다.
 * - 또한, 관리자(권한자)만 접근 가능함을 테스트하고, 없는 ID, 권한 없는 경우 오류처리도 확인한다.
 *
 * 1. 활동 로그 신규 생성 (ID 획득, dependencies의 POST)
 * 2. 해당 ID로 상세조회 → 전체 필드 일치 여부 확인
 * 3. (권한X) 인증 없는 연결로 조회시 권한 오류
 * 4. (NotFound) 무작위 ID로 조회시 404 발생 검증
 */
export async function test_api_discussionBoard_admin_activityLogs_at(
  connection: api.IConnection,
) {
  // 1. 활동 로그 생성 (ID 확보)
  const createBody: IDiscussionBoardActivityLog.ICreate = {
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    actor_type: "admin",
    action_type: "moderation_action",
    action_timestamp: new Date().toISOString(),
    metadata_json: JSON.stringify({ reason: "test moderation" }),
    topic_id: null,
    thread_id: null,
    post_id: null,
    ip_address: "127.0.0.1",
    user_agent: "NestiaE2E/1.0",
  };
  const created =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. 단건 상세 조회 및 전체 필드 매칭 검증
  const detail = await api.functional.discussionBoard.admin.activityLogs.at(
    connection,
    { activityLogId: created.id },
  );
  typia.assert(detail);
  TestValidator.equals("id")(detail.id)(created.id);
  TestValidator.equals("actor_id")(detail.actor_id)(createBody.actor_id);
  TestValidator.equals("actor_type")(detail.actor_type)(createBody.actor_type);
  TestValidator.equals("action_type")(detail.action_type)(
    createBody.action_type,
  );
  TestValidator.equals("action_timestamp")(detail.action_timestamp)(
    createBody.action_timestamp,
  );
  TestValidator.equals("topic_id")(detail.topic_id)(createBody.topic_id);
  TestValidator.equals("thread_id")(detail.thread_id)(createBody.thread_id);
  TestValidator.equals("post_id")(detail.post_id)(createBody.post_id);
  TestValidator.equals("ip_address")(detail.ip_address)(createBody.ip_address);
  TestValidator.equals("user_agent")(detail.user_agent)(createBody.user_agent);
  TestValidator.equals("metadata_json")(detail.metadata_json)(
    createBody.metadata_json,
  );

  // 3. (권한 오류) 인증 없는 연결로 접근 시도
  await TestValidator.error("권한 없는 접근")(async () => {
    const noAuthConn = { ...connection, headers: {} };
    await api.functional.discussionBoard.admin.activityLogs.at(noAuthConn, {
      activityLogId: created.id,
    });
  });

  // 4. (NotFound) 존재하지 않는 activityLogId로 조회 시 404
  const fakeLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("존재하지 않는 로그ID 404")(async () => {
    await api.functional.discussionBoard.admin.activityLogs.at(connection, {
      activityLogId: fakeLogId,
    });
  });
}
