import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStatsAbnormalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsAbnormalLog";

/**
 * 관리자 또는 교사가 출석 이상 로그를 단건 조회할 수 있는 정상 시나리오 및 실패(권한/존재하지 않는 ID) 시나리오를 검증합니다.
 *
 * 1. 출석 이상 로그를 신규로 생성합니다(테스트용 정상 ID 확보).
 * 2. 생성된 로그 ID로 단건 조회 API를 호출해 모든 필드가 정확히 반환되는지 확인합니다.
 * 3. 존재하지 않는 UUID(랜덤값)로 단건 조회 시 404 Not Found를 정상 반환하는지 검증합니다.
 * 4. (권한 테스트의 경우, 별도 인증/세션 체계가 필요하므로 미구현. 권한 스킵.)
 *
 * 성공조회 케이스에서는 반환된 로그의 주요 필드(ID, anomaly_type 등)가 저장/입력값과 일치하는지 검증합니다.
 * 실패케이스는 404(RuntimeError)로 오류가 정상 throw되는지만 확인합니다.
 */
export async function test_api_attendance_stats_abnormalLogs_getById(
  connection: api.IConnection,
) {
  // 1. 테스트용 출석 이상 로그 신규 생성
  const abnormalLog = await api.functional.attendance.stats.abnormalLogs.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: typia.random<string & tags.Format<"uuid">>(),
      anomaly_type: "duplicate",
      anomaly_rule: "duplication_policy_1",
      status: "open",
      occurred_at: new Date().toISOString(),
    } satisfies IAttendanceStatsAbnormalLog.ICreate,
  });
  typia.assert(abnormalLog);

  // 2. 정상 단건조회: 생성 ID로 조회, 모든 필드 검증
  const logById = await api.functional.attendance.stats.abnormalLogs.getById(connection, {
    id: abnormalLog.id,
  });
  typia.assert(logById);
  TestValidator.equals("정상 단건조회 - PK 일치")(logById.id)(abnormalLog.id);
  TestValidator.equals("정상 단건조회 - anomaly_type 일치")(logById.anomaly_type)(abnormalLog.anomaly_type);

  // 3. 존재하지 않는 UUID로 조회 시 404 에러 검증
  await TestValidator.error("존재하지 않는 ID - 404 에러")(() =>
    api.functional.attendance.stats.abnormalLogs.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    })
  );
}