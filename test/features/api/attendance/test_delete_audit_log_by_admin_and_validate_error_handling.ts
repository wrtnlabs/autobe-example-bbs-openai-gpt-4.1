import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuditLog";

/**
 * 감사 로그(IAttendanceAuditLog)의 id 기반 관리 삭제 및 에러 처리 검증
 *
 * 감사 시스템에서 관리자가 auditLogs 엔드포인트로 특정 감사 로그 레코드를 생성 후,
 * 해당 id로 삭제(eraseById)를 정상적으로 수행할 수 있음을 검증하고,
 * 이미 삭제된 id 및 임의 미존재 id에 대한 추가 삭제 시 404 등 적합한 오류가 반환되는지 확인합니다.
 *
 * 인증/권한 분기(예: 권한 없는 사용자의 접근)는 별도 인증 API가 없으므로 본 함수에서는 생략합니다.
 *
 * [검증 시나리오]
 * 1. auditLogs.post API로 감사 로그 생성 (삭제 대상 확보)
 * 2. 정상적인 관리자 권한(가정)으로 eraseById를 실행해 삭제 (에러 발생 X)
 * 3. 동일 id로 eraseById 재요청시 404 등 적절한 에러 발생 여부 확인
 * 4. 아예 존재하지 않는 uuid(id)로 eraseById 시 404 등 적절한 에러 발생 여부 확인
 * 5. 권한 없는 사용자 케이스는 인증 API 부재로 인해 미구현 (주석처리 및 명시)
 */
export async function test_api_attendance_test_delete_audit_log_by_admin_and_validate_error_handling(
  connection: api.IConnection,
) {
  // 1. auditLogs.post로 삭제 대상 감사로그 생성
  const log = await api.functional.attendance.auditLogs.post(connection, {
    body: {
      event_type: RandomGenerator.alphaNumeric(12),
      action_details: RandomGenerator.paragraph()(),
      success: true,
      audited_at: new Date().toISOString(),
    } satisfies IAttendanceAuditLog.ICreate,
  });
  typia.assert(log);

  // 2. 정상 관리자 권한(가정 하)으로 eraseById로 삭제 (에러 없어야 정상)
  await api.functional.attendance.auditLogs.eraseById(connection, {
    id: log.id,
  });

  // 3. 동일 id로 재삭제 시도 시 404 등 적절한 에러 발생 여부 확인
  await TestValidator.error("동일 id 재삭제 시 404 기대")(() =>
    api.functional.attendance.auditLogs.eraseById(connection, {
      id: log.id,
    })
  );

  // 4. 완전히 임의의 미존재 uuid로 eraseById 시 404 등 적절한 에러 발생
  await TestValidator.error("없는 id 삭제 시 404 기대")(() =>
    api.functional.attendance.auditLogs.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>()
    })
  );

  // 5. 권한 없는 사용자 케이스 테스트 생략 (API 부재)
}