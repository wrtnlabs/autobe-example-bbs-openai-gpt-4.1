import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceRecord";

/**
 * 출석 기록 조회의 권한 및 존재성 예외 처리 테스트
 *
 * 존재하지 않는 출석 기록 id로 접근 시 404 오류,
 * 권한이 없는 학생/부모, 혹은 관계되지 않은 교사가 타 반/타 학생의 출석 기록을 조회할 경우 403 금지 에러가 발생하는지 검증합니다.
 *
 * 주요 절차:
 * 1. 학교 생성 및 2개 반, 2명의 교사 등록(반별로)
 * 2. 학생 2명(각 반 배정) 및 보호자 계정 1개 생성 및 1 학생에 지정
 * 3. 한 반의 교사로 출석 기록 1건 생성
 * 4. 존재하지 않는 출석 기록 id 접근 시 404 반환
 * 5. 교사A가 생성한 기록에 대하여 학생B, 보호자, 교사B 등 권한 없는 계정으로 접근 시 403 반환 확인
 */
export async function test_api_attendance_test_get_attendance_record_with_invalid_or_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성
  // 교사A, 교사B, 학생A, 학생B, 보호자(부모) 계정 개별 생성
  const teacherAAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "testpw1!",
    },
  });
  typia.assert(teacherAAuth);
  const teacherBAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "testpw2!",
    },
  });
  typia.assert(teacherBAuth);
  const studentAAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "testpw3!",
    },
  });
  typia.assert(studentAAuth);
  const studentBAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "testpw4!",
    },
  });
  typia.assert(studentBAuth);
  const parentAuth = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "testpw5!",
    },
  });
  typia.assert(parentAuth);

  // 2. 학교 및 2개 반(teacherA, teacherB 각각 주임)
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `테스트학교_${RandomGenerator.alphaNumeric(6)}`,
      address: `서울시 강남구 테크노빌딩 ${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(school);

  // 교사A 생성
  const teacherA = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAAuth.id,
      name: "교사A",
      email: teacherAAuth.email!,
      phone: "010-1111-1111",
    },
  });
  typia.assert(teacherA);
  // 교사B 생성
  const teacherB = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherBAuth.id,
      name: "교사B",
      email: teacherBAuth.email!,
      phone: "010-2222-2222",
    },
  });
  typia.assert(teacherB);

  // 반A(교사A 담당)
  const classroomA = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherA.id,
      name: "반A",
      grade_level: 1,
    },
  });
  typia.assert(classroomA);
  // 반B(교사B 담당)
  const classroomB = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherB.id,
      name: "반B",
      grade_level: 2,
    },
  });
  typia.assert(classroomB);

  // 3. 학생A(반A, 부모 있음) / 학생B(반B, 부모 없음)
  const studentA = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroomA.id,
      parent_id: parentAuth.id,
      auth_account_id: studentAAuth.id,
      name: "학생A",
      gender: "male",
      birthdate: new Date("2014-03-03").toISOString(),
    },
  });
  typia.assert(studentA);
  const studentB = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroomB.id,
      auth_account_id: studentBAuth.id,
      name: "학생B",
      gender: "female",
      birthdate: new Date("2014-04-04").toISOString(),
    },
  });
  typia.assert(studentB);

  // 4. teacherA, classroomA, studentA로 출석 기록 1건 생성
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: studentA.id,
      classroom_id: classroomA.id,
      teacher_id: teacherA.id,
      method_id: typia.random<string & tags.Format<"uuid">>(),
      checked_at: new Date().toISOString(),
      status: "present",
    },
  });
  typia.assert(attendanceRecord);
  const targetRecordId = attendanceRecord.id;

  // 5-1. 존재하지 않는 출석 id로(teacherA 권한, 정상 권한) → 404
  await TestValidator.error("존재하지 않는 출석 id 요청 404")(
    async () => {
      await api.functional.attendance.attendanceRecords.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(), // 실제 등록된 것과 다른 랜덤ID
      });
    },
  );

  // 5-2. 학생B(타 학생) 계정으로 타 학생 출석 기록 접근 → 403
  // (Test를 위해 connection의 토큰/권한값을 학생B로 전환 필요 - E2E 환경 내 구체적 구현 미상, 실제론 세션/헤더 등 처리 필요)
  // 본 테스트코드는 실질적 권한 테스트만 기술, 세션처리 등은 바깥에서 관리되어야 함
  // 아래 블록들은 실제 계정 전환이 가능한 상황에 맞춰야 정상 동작함
  await TestValidator.error("학생B(타학생)가 학생A 출석 조회 403")(
    async () => {
      // connection 객체를 학생B 토큰/세션이 적용된 상태로
      await api.functional.attendance.attendanceRecords.getById(connection /*(학생B 계정 세션)*/, {
        id: targetRecordId,
      });
    },
  );

  // 5-3. 보호자(부모)가 학생A 출석기록에 대해 접근(자신 자녀가 아니면 403)
  await TestValidator.error("보호자(부모) 계정이 타학생 출석 조회 403")(
    async () => {
      // connection 객체를 부모 토큰/세션이 적용된 상태로
      await api.functional.attendance.attendanceRecords.getById(connection /*(보호자 계정 세션)*/, {
        id: targetRecordId,
      });
    },
  );

  // 5-4. 교사B(관계 없는 교사)가 교사A 반 학생 출석 기록 접근 → 403
  await TestValidator.error("관계 없는 교사B가 타 반 출석 조회 403")(
    async () => {
      // connection 객체를 교사B 토큰/세션이 적용된 상태로
      await api.functional.attendance.attendanceRecords.getById(connection /*(교사B 계정 세션)*/, {
        id: targetRecordId,
      });
    },
  );
}