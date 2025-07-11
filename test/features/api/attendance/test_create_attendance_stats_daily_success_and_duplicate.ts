import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceStatsDaily } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsDaily";

/**
 * 출석 일별 통계(StatsDaily) 신규 생성의 정상 케이스와 주요 실패 케이스를 검증한다.
 *
 * - 시스템에 관리자 권한 계정이 존재한다고 가정함(의존성: auth/accounts)
 * - 통계 생성을 위해 필요한 school과 classroom 사전 생성(의존성: schools, classrooms)
 *
 * [테스트 시나리오]
 * 1. 신규 관리자 계정(email, password) 생성 및 인증(토큰 포함됨)
 * 2. random school 생성 → school_id 확보
 * 3. teacher 계정 생성 (role 미보장, 후처리 필요시 더미값 사용)
 * 4. 위 school_id, teacher_id로 classroom 생성 → classroom_id 확보
 * 5. 신규 (classroomId, day) 조합으로 StatsDaily 생성(성공) 및 결과 확인
 * 6. 동일 (classroomId, day)로 StatsDaily 재생성 시 409 오류 발생 여부 검증(중복 케이스)
 * 7. 필수 필드 누락(body에서 일부 property 삭제) 시 422 오류 검증
 * 8. 권한 없는 인증헤더/토큰 없이(혹은 잘못된 토큰) StatsDaily 생성 요청 시 401/403 오류 검증
 */
export async function test_api_attendance_test_create_attendance_stats_daily_success_and_duplicate(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "testpassword1!";
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    },
  });
  typia.assert(adminAccount);

  // 2. 랜덤 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `학교_${RandomGenerator.alphabets(6)}`,
      address: `서울시 강남구 ${RandomGenerator.alphaNumeric(5)}길 12`,
    },
  });
  typia.assert(school);

  // 3. teacher 계정 생성 (role 미보장, 후처리 필요시 더미값 사용)
  const teacherEmail = typia.random<string & tags.Format<"email">>();
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: teacherEmail,
      password_hash: "dummyteacherpw1!",
    },
  });
  typia.assert(teacherAccount);

  // 4. school, teacher로 classroom 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAccount.id,
      name: RandomGenerator.alphabets(4),
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // 5. (classroomId, day) 조합으로 StatsDaily 생성(정상)
  const statsDay = "2025-07-09";
  const statsBody = {
    classroomId: classroom.id,
    schoolId: school.id,
    day: statsDay,
    presentCount: 10,
    lateCount: 2,
    absentCount: 1,
    earlyLeaveCount: 0,
  } satisfies IAttendanceStatsDaily.ICreate;
  const stats = await api.functional.attendance.stats.daily.post(connection, { body: statsBody });
  typia.assert(stats);
  TestValidator.equals("출석 통계 정상 생성됨")(stats.classroomId)(classroom.id);
  TestValidator.equals("day 필드 매칭")(stats.day)(statsDay);

  // 6. 동일 (classroomId, day) 조합 재생성: 409 Conflict 오류 확인
  await TestValidator.error("중복 출석통계 생성시 409 오류")(
    async () => {
      await api.functional.attendance.stats.daily.post(connection, { body: statsBody });
    },
  );

  // 7. 필수 필드 누락(예: day 미포함) → 422 오류
  await TestValidator.error("필수 필드 누락시 422 오류")(
    async () => {
      const body = { ...statsBody };
      // @ts-expect-error 테스트 목적, day 삭제
      delete body.day;
      await api.functional.attendance.stats.daily.post(connection, { body });
    },
  );

  // 8. 인증 미포함 요청(잘못된 connection 객체)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("인증 없는 요청 401/403 오류")(
    async () => {
      await api.functional.attendance.stats.daily.post(unauthConnection, { body: statsBody });
    },
  );
}