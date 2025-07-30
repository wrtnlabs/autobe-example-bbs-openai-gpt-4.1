import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * 관리자가 감사 로그 단건 삭제 기능을 정상적으로 수행할 수 있는지 검증한다.
 *
 * - AuditLog 엔트리를 생성한 뒤, 생성된 id(auditLogId)로 삭제 요청을 수행한다.
 * - 삭제 성공 후, 해당 id로 재조회하면 NotFound 오류가 반환되는지(지원 API가 있다면) 확인한다.
 * - 전 과정은 admin 권한 context로 수행됨을 전제로 한다.
 *
 * 테스트 시나리오:
 *
 * 1. 신규 감사 로그 생성 → 생성된 id 확보
 * 2. 해당 감사 로그 id로 delete(erase) 수행 후 성공적으로 삭제됨을 확인
 * 3. (지원시) 삭제된 id로 재조회 시 NotFound 오류 반환 검증
 */
export async function test_api_discussionBoard_admin_auditLogs_test_delete_audit_log_by_id_as_admin_success(
  connection: api.IConnection,
) {
  // 1. 감사 로그 생성 (auditLogId 확보)
  const createInput: IDiscussionBoardAuditLog.ICreate = {
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "unit_test_action_type",
    action_detail: "unit test 삭제 검증용 로그 엔트리.",
  };
  const createdLog =
    await api.functional.discussionBoard.admin.auditLogs.create(connection, {
      body: createInput,
    });
  typia.assert(createdLog);

  // 2. 생성된 감사 로그 id 확보
  const auditLogId = createdLog.id;

  // 3. 해당 id로 감사 로그 삭제 요청 (정상 반환 확인)
  await api.functional.discussionBoard.admin.auditLogs.erase(connection, {
    auditLogId,
  });
  // erase: void 반환, 예외 없으면 삭제 완료

  // 4. 삭제 후 동일 id로 재조회 시 NotFound(HttpError) 오류 반환 확인 (만약 read API 제공 시)
  // await TestValidator.error("삭제된 감사 로그 재조회 시 NotFound 오류")(async () => {
  //   await api.functional.discussionBoard.admin.auditLogs.read(connection, { auditLogId });
  // });
}
