import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceStatsDaily } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsDaily";

/**
 * 출석 일별 통계 단건 조회 및 권한/존재하지 않는 케이스 확인
 *
 * 출석 일별 통계(id: uuid)가 정상적으로 생성되어 있는 경우,
 * 1. 해당 id로 상세 조회하면 일치하는 row 전체 정보가 반환된다 (정상 케이스)
 * 2. 생성하지 않은 임의의 id(uuid)로 조회 요청 시 404 오류가 발생한다
 * 3. 권한 없는/비인증 사용자(계정 미생성)로 접근 시 401 or 403 오류가 발생한다
 *
 * [테스트 흐름]
 * 1. 관리자/교사 계정 생성 (accounts.post)
 * 2. stats.daily.post로 출석통계 row 생성
 * 3. stats.daily.getById로 id 기반 정상 조회 (테스트 1)
 * 4. 존재하지 않는 id로 조회 시도 (테스트 2)
 * 5. 비인증 connection으로 권한 없는 접근 시도 (테스트 3)
 */
export async function test_api_attendance_test_get_attendance_stats_daily_by_id_found_and_not_found(
  connection: api.IConnection,
) {
  // 1. 관리자/교사 계정 생성
  const userEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await api.functional.attendance.auth.accounts.post(
    connection,
    {
      body: {
        email: userEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies IAttendanceAuthAccount.ICreate,
    },
  );
  typia.assert(adminAccount);

  // 2. 출석통계 row 생성
  const statsCreateInput = {
    classroomId: typia.random<string & tags.Format<"uuid">>(),
    schoolId: typia.random<string & tags.Format<"uuid">>(),
    day: "2025-05-23",
    presentCount: 28,
    lateCount: 3,
    absentCount: 1,
    earlyLeaveCount: 0,
  } satisfies IAttendanceStatsDaily.ICreate;
  const statsRow = await api.functional.attendance.stats.daily.post(
    connection,
    { body: statsCreateInput },
  );
  typia.assert(statsRow);

  // 3. 정상 id로 상세 조회 (200)
  const found = await api.functional.attendance.stats.daily.getById(
    connection,
    { id: statsRow.id },
  );
  typia.assert(found);
  TestValidator.equals("정상 상세 조회: id 및 주요 필드")(found.id)(statsRow.id);
  TestValidator.equals("상세 조회 presentCount")(found.presentCount)(statsCreateInput.presentCount);
  TestValidator.equals("상세 조회 absentCount")(found.absentCount)(statsCreateInput.absentCount);
  TestValidator.equals("상세 조회 classroomId")(found.classroomId)(statsCreateInput.classroomId);

  // 4. 존재하지 않는 id로 404 검증
  await TestValidator.error("존재하지 않는 id 404 오류")(
    async () => {
      await api.functional.attendance.stats.daily.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. 인증 없는 connection으로 401/403 오류
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("비인증(권한없음) 401/403 오류")(
    async () => {
      await api.functional.attendance.stats.daily.getById(anonymousConnection, {
        id: statsRow.id,
      });
    },
  );
}