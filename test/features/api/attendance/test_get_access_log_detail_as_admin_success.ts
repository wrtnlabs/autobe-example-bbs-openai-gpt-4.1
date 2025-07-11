import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";

/**
 * 특정 접근 로그 상세정보 정상 조회 시나리오 (관리자 권한)
 *
 * 관리자가 유효한 접근 로그 ID를 입력하면 해당 로그의 상세 정보 (사용자, IP, user-agent, 이벤트 시각 등)
 * 가 모두 정확하게 반환되는 것을 검증한다.
 *
 * 본 테스트는 단일 접근 로그 레코드를 사전에 생성한 뒤,
 * 해당 id로 상세 조회를 수행하여 모든 필드값이 DB에 저장된 값과 일치하는지 검증한다.
 *
 * 1. 접근 로그를 신규 등록한다 (POST /attendance/accessLogs)
 * 2. 바로 이전에 생성한 접근 로그의 id로 상세 조회를 요청한다 (GET /attendance/accessLogs/{id})
 * 3. 반환된 모든 필드가 생성 시 반환받은 값과 동일한지 검증한다
 */
export async function test_api_attendance_accessLogs_getById(
  connection: api.IConnection
) {
  // 1. 접근 로그 신규 등록
  const createLog: IAttendanceAccessLog =
    await api.functional.attendance.accessLogs.post(connection, {
      body: {
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        student_id: null,
        parent_id: null,
        admin_id: null,
        classroom_id: null,
        ip_address: "192.168.0.1",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        device_id: null,
        accessed_at: new Date().toISOString() as string & tags.Format<"date-time">,
      } satisfies IAttendanceAccessLog.ICreate,
    });
  typia.assert(createLog);

  // 2. 상세조회: 생성된 로그의 id로 조회
  const detail: IAttendanceAccessLog =
    await api.functional.attendance.accessLogs.getById(connection, {
      id: createLog.id,
    });
  typia.assert(detail);

  // 3. 반환된 모든 필드가 생성 결과와 같은 값인지 검증
  TestValidator.equals("id")(detail.id)(createLog.id);
  TestValidator.equals("teacher_id")(detail.teacher_id)(createLog.teacher_id);
  TestValidator.equals("student_id")(detail.student_id)(createLog.student_id);
  TestValidator.equals("parent_id")(detail.parent_id)(createLog.parent_id);
  TestValidator.equals("admin_id")(detail.admin_id)(createLog.admin_id);
  TestValidator.equals("classroom_id")(detail.classroom_id)(createLog.classroom_id);
  TestValidator.equals("ip_address")(detail.ip_address)(createLog.ip_address);
  TestValidator.equals("user_agent")(detail.user_agent)(createLog.user_agent);
  TestValidator.equals("device_id")(detail.device_id)(createLog.device_id);
  TestValidator.equals("accessed_at")(detail.accessed_at)(createLog.accessed_at);
}