import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IDeleteResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeleteResult";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 학급 삭제(Delete Classroom) API의 정상/예외 상황 통합 테스트
 *
 * 이 함수는 학급(클래스) 삭제 기능의 완전성을 검증하기 위해 다음의 다양한 실제 케이스를 통합 검증합니다.
 *
 * 1. 관리자 권한을 통해 관련 학교/교사/학급 엔티티 사전 생성
 * 2. FK 제약 없는(학생 없는) 학급 삭제 정상 동작 검증(삭제 성공)
 * 3. FK(학생) 존재하는 학급 삭제 거부(FK 제약)
 * 4. 존재하지 않는 학급ID로 삭제 시도(404 반환)
 * 5. (권한 없는 계정 시나리오는 별도 인증 시스템 연동 필요시 확장)
 *
 * 개별 단계에서 각 엔티티의 관계를 명확히 연결하며,
 * typia.assert, TestValidator.equals, TestValidator.error 등을 통한 타입·비즈니스 결과 검증을 모두 포함합니다.
 */
export async function test_api_attendance_test_delete_classroom_with_permission_and_fk_constraints(
  connection: api.IConnection,
) {
  // 1. 관리자용 인증 계정 생성
  const adminAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed-password",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(adminAccount);

  // 2. 학교 엔티티 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: "삭제-테스트 학교",
      address: "서울시 테스트구 123-45",
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교사 엔티티 생성
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: adminAccount.id,
      name: "홍길동",
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010-1234-5678",
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(teacher);

  // 4. FK 없는 학급 엔티티 생성(정상 삭제용)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: "1학년 2반",
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 5. FK(학생) 있는 학급 엔티티 별도 생성(삭제 거부 테스트용)
  const classroomWithStudent = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: "1학년 3반",
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroomWithStudent);

  // 6. 학생 엔티티 생성 (해당 학급 연결)
  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed-password-student",
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(studentAccount);

  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroomWithStudent.id,
      auth_account_id: studentAccount.id,
      name: "철수",
      gender: "male",
      birthdate: new Date().toISOString(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // ================== [정상 삭제 케이스] ==================
  // 학생이 없는 학급은 정상적으로 삭제된다
  const deleteResult = await api.functional.attendance.classrooms.eraseById(connection, {
    id: classroom.id,
  });
  typia.assert(deleteResult);
  TestValidator.equals("성공적으로 삭제됨")(deleteResult.success)(true);
  TestValidator.predicate("삭제 메시지 반환됨")(!!deleteResult.message);

  // ================== [FK 제약 위반 케이스] ==================
  // 학생(FK)이 연결된 학급을 삭제 시도할 때 에러 발생
  await TestValidator.error("학생이 있는 학급 삭제 거부")(() =>
    api.functional.attendance.classrooms.eraseById(connection, {
      id: classroomWithStudent.id,
    })
  );

  // ================== [존재하지 않는 ID 삭제 케이스] ==================
  // 실제로 생성되지 않은 UUID로 삭제 시도하면 에러 발생(404 or 실패)
  await TestValidator.error("존재하지 않는 학급 삭제 시 404")(() =>
    api.functional.attendance.classrooms.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    })
  );

  // (확장: 권한 없는 계정으로의 삭제 시도는 인증/세션 API가 별도 존재시 컨트롤)
}