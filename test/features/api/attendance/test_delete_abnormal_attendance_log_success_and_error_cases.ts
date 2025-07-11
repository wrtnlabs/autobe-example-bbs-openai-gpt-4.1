import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStatsAbnormalLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsAbnormalLog";

/**
 * 출석 이상 로그(비정상 출석 기록) 삭제 및 예외 케이스 검증
 *
 * 이 테스트는 관리자가 출석 이상 로그를 정상적으로 삭제하는 과정과, 이미 삭제된 로그 혹은 존재하지 않는 ID, 권한이 없는 사용자로의 삭제 시도 등 오류/예외 상황을 종합적으로 검사한다.
 *
 * 1. 테스트용 출석 이상 로그를 생성한다.
 * 2. 생성된 로그의 id로 삭제 API를 호출하여 정상 삭제 처리를 확인한다.
 * 3. 동일 id로 삭제 재요청 시 에러(이미 삭제된 대상)를 반환하는지 확인한다.
 * 4. 임의의 무작위 UUID(존재하지 않는 id)로 삭제 시도 시 에러 반환을 확인한다.
 * 5. (추가 구현 가능시) 권한 없는 사용자(예: 일반학생, 미로그인)로 삭제 시도 시 권한 에러 반환을 확인한다.
 * 6. 삭제된 id로 조회(또는 적절한 추가 API가 있다면 목록조회) 시 그 로그가 더 이상 존재하지 않음을 검증한다.
 */
export async function test_api_attendance_test_delete_abnormal_attendance_log_success_and_error_cases(
  connection: api.IConnection,
) {
  // 1. 테스트용 출석 이상 로그 생성
  const abnormalLog = await api.functional.attendance.stats.abnormalLogs.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<'uuid'>>(),
      student_id: typia.random<string & tags.Format<'uuid'>>(),
      anomaly_type: 'duplicate',
      anomaly_rule: 'basic_duplicate',
      status: 'open',
      occurred_at: new Date().toISOString() as string & tags.Format<'date-time'>,
    }
  });
  typia.assert(abnormalLog);

  // 2. 생성된 로그 id로 정상 삭제
  await api.functional.attendance.stats.abnormalLogs.eraseById(connection, {
    id: abnormalLog.id,
  });

  // 3. 같은 id로 재삭제 시 에러 발생 확인
  await TestValidator.error('이미 삭제된 로그 id 재삭제 시 에러')(
    async () => {
      await api.functional.attendance.stats.abnormalLogs.eraseById(connection, { id: abnormalLog.id });
    }
  );

  // 4. 존재하지 않는 랜덤 UUID로 삭제 시 에러 발생 확인
  await TestValidator.error('존재하지 않는 로그 id로 삭제 시 에러')(
    async () => {
      await api.functional.attendance.stats.abnormalLogs.eraseById(connection, {
        id: typia.random<string & tags.Format<'uuid'>>()
      });
    }
  );

  // 6. (조회 가능시) 삭제된 로그가 목록/조회에서 제외됨을 확인하는 추가 검증은 별도 API 확인 필요
}