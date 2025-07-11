import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";

/**
 * 접근 로그(출결 시스템 이벤트) 정상 생성 및 반환값 저장 검증
 *
 * 접근 로그(access log)는 출결 시스템의 각종 주요 행동(출입, 대시보드, 민감데이터 보기 등)에 대해 반드시 생성ㆍ기록되어야 함
 * 본 테스트는 유효한 사용자(예: 교사/학생/학부모/관리자 중 하나 이상), 유효한 classroom, 그리고 필수 정보(ip_address, user_agent, accessed_at 등)를 포함하여 access log를 생성하는 시나리오임.
 *
 * 1. 가상의 PK(FK) uuid 값 및 ip/user-agent/시각 등 필수 데이터를 준비
 * 2. API를 통해 access log 생성 요청 (필수 및 몇몇 optional 값 채움)
 * 3. 성공적으로 레코드가 생성되어 PK(id)가 반환되고, 입력값이 응답 데이터에 모두 정확히 저장되었는지 검증
 */
export async function test_api_attendance_accessLogs_post(
  connection: api.IConnection,
) {
  // 1. 테스트용 접근 로그 입력값 준비
  const input: IAttendanceAccessLog.ICreate = {
    // 접속자: 예시로 student_id를 부여, 그 외는 null
    student_id: typia.random<string & tags.Format<"uuid">>(),
    teacher_id: null,
    parent_id: null,
    admin_id: null,
    classroom_id: typia.random<string & tags.Format<"uuid">>(),
    ip_address: "192.168.10.123",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    device_id: "device-abcdef1234567890",
    accessed_at: typia.random<string & tags.Format<"date-time">>(),
  };

  // 2. API 호출하여 접근 로그 생성
  const output = await api.functional.attendance.accessLogs.post(connection, {
    body: input,
  });
  typia.assert(output);

  // 3. 반환 데이터: PK(id)와 입력값 검증
  TestValidator.predicate("반환 id(uuid) 존재")(!!output.id);
  TestValidator.equals("student_id 확인")(output.student_id)(input.student_id);
  TestValidator.equals("teacher_id null")(output.teacher_id)(null);
  TestValidator.equals("parent_id null")(output.parent_id)(null);
  TestValidator.equals("admin_id null")(output.admin_id)(null);
  TestValidator.equals("classroom_id 확인")(output.classroom_id)(input.classroom_id);
  TestValidator.equals("ip_address 확인")(output.ip_address)(input.ip_address);
  TestValidator.equals("user_agent 확인")(output.user_agent)(input.user_agent);
  TestValidator.equals("device_id 확인")(output.device_id)(input.device_id);
  TestValidator.equals("accessed_at 확인")(output.accessed_at)(input.accessed_at);
}