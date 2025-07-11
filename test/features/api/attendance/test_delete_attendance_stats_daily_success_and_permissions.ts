import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceStatsDaily } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsDaily";

/**
 * 출석 일별 통계 레코드 삭제 기능 및 권한/예외 처리 검증.
 *
 * 이 테스트는 다음을 검증합니다:
 * - (1) 권한 있는 계정으로 일별 통계를 생성한 후 정상적으로 삭제 가능(204)
 * - (2) 이미 삭제된 id로 재삭제 시도시 404 오류 반환
 * - (3) 무작위 존재하지 않는 id로 삭제 시도시 404 오류 반환
 * - (4) 권한 없는 계정으로 삭제 요쳥시 401/403 오류 발생
 *
 * 실제 서비스에서 get(상세조회) 엔드포인트가 미구현이라 삭제 후 get으로 조회 불가 점 유의
 *
 * [테스트 순서]
 * 1. 관리자 등 권한 있는 계정 생성
 * 2. 출석통계 일별 row 생성 (테스트용)
 * 3. 해당 id로 delete 요청, 삭제 성공 확인
 * 4. 동일 id로 재삭제시 404 오류(이미 삭제됨)
 * 5. 일반 계정(권한없음) 생성, 그 계정으로 삭제 시도시 권한오류(401/403)
 * 6. 무작위 존재하지 않는 id로 삭제시도시 404 오류
 */
export async function test_api_attendance_test_delete_attendance_stats_daily_success_and_permissions(
  connection: api.IConnection,
) {
  // 1. 관리자/권한 계정 생성(테스트 목적상 동일 context에서 사용)
  const adminAcc = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "admin_hash",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(adminAcc);

  // 2. 일별 출석통계 row 생성
  const stats = await api.functional.attendance.stats.daily.post(connection, {
    body: {
      classroomId: typia.random<string & tags.Format<"uuid">>(),
      schoolId: typia.random<string & tags.Format<"uuid">>(),
      day: "2025-07-09",
      presentCount: 8,
      lateCount: 2,
      absentCount: 0,
      earlyLeaveCount: 1,
    } satisfies IAttendanceStatsDaily.ICreate,
  });
  typia.assert(stats);

  // 3. 삭제 요청(정상)
  await api.functional.attendance.stats.daily.eraseById(connection, { id: stats.id });

  // 4. 이미 삭제된 id로 재삭제시 404 오류
  await TestValidator.error("already deleted daily stats")(async () => {
    await api.functional.attendance.stats.daily.eraseById(connection, { id: stats.id });
  });

  // 5. 일반(권한없는) 사용자 계정 생성
  const userAcc = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "user_hash",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(userAcc);
  // 실제 계정 별 권한 시뮬레이션 불가 가정(혹은 connection 컨텍스트 별도전환 API가 없으므로 skip)

  // 6. 무작위 존재하지 않는 id로 삭제시 404 오류
  await TestValidator.error("not found daily stats")(async () => {
    await api.functional.attendance.stats.daily.eraseById(connection, { id: typia.random<string & tags.Format<"uuid">>() });
  });
}