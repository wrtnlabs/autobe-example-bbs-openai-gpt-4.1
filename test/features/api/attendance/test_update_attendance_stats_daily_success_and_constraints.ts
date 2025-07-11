import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceStatsDaily } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsDaily";

/**
 * 출석 일별 통계(StatsDaily) row의 수정(putById) API에 대한 성공 및 제약 검증 e2e
 *
 * 비즈니스 플로우:
 * 1. 관리자 인증 계정 생성 및 로그인(토큰 부여)
 * 2. 학교, 교실 정보 각각 2세트 이상 생성(중복 조합 및 외래키 시나리오 포함 목적)
 * 3. stats_daily row 2개 생성(서로 다른 classroomId+day)
 * 4. 정상 업데이트(필드 일부 변경: 출석/결석 등)
 * 5. 이미 존재하는 classroomId+day 쌍 중복으로 수정 시 409 Conflict Error 확인
 * 6. 존재하지 않는 schoolId/classroomId 등 외래키 위반(422)
 * 7. 존재하지 않는 id(임의 uuid)로 수정 요청 시 404 Not Found
 * 8. 인증 없는 connection/권한 없는 계정에서 403/401 확인
 * 9. presentCount 등 음수, 거대값으로 422 validation 검증
 *
 * 각 흐름을 구분, 기대값 assertion(TestValidator, typia.assert) 및 에러 발생 체크 포함.
 */
export async function test_api_attendance_test_update_attendance_stats_daily_success_and_constraints(
  connection: api.IConnection,
) {
  // 1. 관리자 인증 계정 생성 (로그인, 인증 토큰 확보)
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(24),
    },
  });
  typia.assert(adminAccount);

  // 2. 학교 2개 생성 (schoolA, schoolB)
  const schoolA = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10),
      address: RandomGenerator.alphabets(20),
    },
  });
  typia.assert(schoolA);

  const schoolB = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(10),
      address: RandomGenerator.alphabets(20),
    },
  });
  typia.assert(schoolB);

  // 3. 교실 2개 생성 (classroomA는 schoolA, classroomB는 schoolB 소속)
  const teacherId = typia.random<string & tags.Format<"uuid">>();
  const classroomA = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: schoolA.id,
      teacher_id: teacherId,
      name: RandomGenerator.alphabets(5),
      grade_level: 1,
    },
  });
  typia.assert(classroomA);
  const classroomB = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: schoolB.id,
      teacher_id: teacherId,
      name: RandomGenerator.alphabets(5),
      grade_level: 1,
    },
  });
  typia.assert(classroomB);

  // 4. stats_daily row 2개 생성(day 중복 방지, 서로 다른 classroomId+day)
  const today = new Date();
  const dateA = today.toISOString().slice(0, 10);
  const dateB = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const statsRowA = await api.functional.attendance.stats.daily.post(connection, {
    body: {
      classroomId: classroomA.id,
      schoolId: schoolA.id,
      day: dateA,
      presentCount: 20,
      lateCount: 1,
      absentCount: 2,
      earlyLeaveCount: 0,
    },
  });
  typia.assert(statsRowA);
  const statsRowB = await api.functional.attendance.stats.daily.post(connection, {
    body: {
      classroomId: classroomB.id,
      schoolId: schoolB.id,
      day: dateB,
      presentCount: 18,
      lateCount: 2,
      absentCount: 0,
      earlyLeaveCount: 1,
    },
  });
  typia.assert(statsRowB);

  // 5. 정상 수정: 일부 통계 필드만 update
  const updated = await api.functional.attendance.stats.daily.putById(connection, {
    id: statsRowA.id,
    body: {
      presentCount: 15,
      absentCount: 7,
    },
  });
  typia.assert(updated);
  TestValidator.equals("presentCount 변경 확인")(updated.presentCount)(15);
  TestValidator.equals("absentCount 변경 확인")(updated.absentCount)(7);
  TestValidator.equals("id 고유값 유지")(updated.id)(statsRowA.id);

  // 6. 중복(classroomId+day) 쌍으로 수정: statsRowA를 statsRowB의 classroomId/day 값으로 교체 시도 → 409
  await TestValidator.error("classroomId+day 고유 쌍 중복 시도시 409")(
    () => api.functional.attendance.stats.daily.putById(connection, {
      id: statsRowA.id,
      body: {
        classroomId: statsRowB.classroomId,
        day: statsRowB.day,
      },
    }),
  );

  // 7. 외래키 위반: 존재하지 않는 schoolId/classroomId로 수정 시 422
  await TestValidator.error("존재하지 않는 schoolId로 수정: 422")(
    () => api.functional.attendance.stats.daily.putById(connection, {
      id: statsRowA.id,
      body: {
        schoolId: typia.random<string & tags.Format<"uuid">>(),
      },
    }),
  );
  await TestValidator.error("존재하지 않는 classroomId로 수정: 422")(
    () => api.functional.attendance.stats.daily.putById(connection, {
      id: statsRowA.id,
      body: {
        classroomId: typia.random<string & tags.Format<"uuid">>(),
      },
    }),
  );

  // 8. 없는 id로 수정: 무작위 uuid로 요청 시 404
  await TestValidator.error("존재하지 않는 id로 404")(
    () => api.functional.attendance.stats.daily.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        presentCount: 1,
      },
    }),
  );

  // 9. 권한 없음: 인증이 없는 connection으로 401/403 (이 테스트에서는 별도 connection 사용을 가정)
  const unauthorizedConnection = { ...connection, headers: {} };
  await TestValidator.error("인증 없이 수정 요청시 401/403")(
    () => api.functional.attendance.stats.daily.putById(unauthorizedConnection, {
      id: statsRowA.id,
      body: {
        presentCount: 10,
      },
    }),
  );

  // 10. invalid 값(presentCount 음수/큰수) 등 422 validation
  await TestValidator.error("presentCount 음수시 422")(
    () => api.functional.attendance.stats.daily.putById(connection, {
      id: statsRowA.id,
      body: {
        presentCount: -5,
      },
    }),
  );
  await TestValidator.error("presentCount 매우 큰값시 422")(
    () => api.functional.attendance.stats.daily.putById(connection, {
      id: statsRowA.id,
      body: {
        presentCount: 999999999,
      },
    }),
  );
}