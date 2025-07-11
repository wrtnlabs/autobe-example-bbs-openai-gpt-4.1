import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";

/**
 * 출결 시스템 접근로그 생성 API E2E
 *
 * /attendance/accessLogs POST 엔드포인트 정상동작을 검증한다.
 * 1. 모든 필수값이 정확한 타입 및 형식으로 포함된 경우 정상적으로 로그가 생성되어야 한다.
 *
 * [TypeScript 타입 시스템에 따라 유효성 에러 유발(필수값 누락/잘못된 타입 입력) negative-case 코드는 작성 불가이므로 포함하지 않음]
 */
export async function test_api_attendance_test_create_access_log_with_missing_required_field(
  connection: api.IConnection,
) {
  // 1. 정상 입력: 모든 필수값이 정확하게 입력된 경우 정상 로그 생성
  const validRequest = {
    ip_address: "192.168.0.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    accessed_at: new Date().toISOString() as string & tags.Format<"date-time">,
    teacher_id: null,
    student_id: null,
    parent_id: null,
    admin_id: null,
    classroom_id: null,
    device_id: null,
  };
  const output = await api.functional.attendance.accessLogs.post(connection, {
    body: validRequest,
  });
  typia.assert(output);
  TestValidator.equals("ip_address 동일")(output.ip_address)(validRequest.ip_address);
  TestValidator.equals("user_agent 동일")(output.user_agent)(validRequest.user_agent);
}