import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAccessLog";

/**
 * 존재하는 출결 시스템 접근 로그(access log)의 user-agent 또는 ip address 등 일부 속성을 수정할 때
 * 정상적으로 반영 및 저장되는 것을 검증합니다.
 *
 * 이 테스트는 다음과 같은 실제 업무 시나리오를 검증합니다:
 * 1. 먼저 접근 로그를 1건 생성합니다.
 * 2. 이후 해당 로그의 user-agent와 ip address 속성만 일부 변경합니다.
 * 3. putById로 수정 요청 후 반환된 레코드의 값이 실제로 변경되었는지 확인합니다.
 * 4. 응답 값의 수정된 필드(user_agent, ip_address)와 요청 값이 일치하는지 검증합니다.
 * 5. (비즈니스적 확장) audit 로그 업데이트 트리거 여부는 별도 API 미제공으로 본 테스트에서는 검증하지 않습니다.
 *
 * @author AutoBE
 */
export async function test_api_attendance_accessLogs_test_update_access_log_event_success(
  connection: api.IConnection,
) {
  // 1. 접근 로그 1건 생성 (사전 조건 충족)
  const accessLogCreateInput: IAttendanceAccessLog.ICreate = {
    ip_address: "192.0.2.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
    accessed_at: new Date().toISOString(),
  };
  const createdLog = await api.functional.attendance.accessLogs.post(connection, {
    body: accessLogCreateInput,
  });
  typia.assert(createdLog);

  // 2. 일부 속성 (user_agent, ip_address)만 변경하여 PUT
  const updatePayload: IAttendanceAccessLog.IUpdate = {
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
    ip_address: "203.0.113.8",
  };
  const updatedLog = await api.functional.attendance.accessLogs.putById(connection, {
    id: createdLog.id,
    body: updatePayload,
  });
  typia.assert(updatedLog);

  // 3. 수정된 값이 반영됐는지 필드별 검증
  TestValidator.equals("user_agent 필드 반영됨")(updatedLog.user_agent)(updatePayload.user_agent);
  TestValidator.equals("ip_address 필드 반영됨")(updatedLog.ip_address)(updatePayload.ip_address);
}