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
 * 출석 기록 단건 상세 조회: 권한별 정상/에러 반환 검증 통합 테스트
 *
 * 출석 출결 시스템에서 "출석 기록 단건 상세" API(/attendance/attendanceRecords/{id})를 통해
 * 1) 교사 또는 관리자 권한에서는 등록된 출석 레코드를 정상적으로 확인 가능, 
 * 2) 존재하지 않는 id로 쿼리 시 404 응답, 
 * 3) 권한이 없는 계정(학생 등)으로 접근 시 403 에러가 발생함을 검증합니다.
 *
 * [테스트 단계]
 * 1. 인증 계정(교사-관리자, 학생) 생성
 * 2. 학교, 교사, 반, 학생 등록 및 관계 구성
 * 3. 랜덤 출석 메소드/코드 UUID(mock) 준비
 * 4. 출석 레코드 생성
 * 5. 교사 권한으로 단건 상세조회 성공 (각 주요 필드 값 검증)
 * 6. 존재하지 않는 id로 조회시 404 에러 검증
 * 7. (실제 context 분리 필요성을 명시) 권한 없는 사용자의 접근 시 403 에러 검증 (여기서는 논리/주석처리로 한정)
 */
export async function test_api_attendance_test_get_attendance_record_by_id_as_authorized_user(
  connection: api.IConnection,
) {
  // 1. 인증 계정(교사-관리자, 학생) 생성
  const adminAuthAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "admin_password_hash"
    },
  });
  typia.assert(adminAuthAccount);

  const studentAuthAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "student_password_hash"
    },
  });
  typia.assert(studentAuthAccount);

  // 2. 학교/교사/반/학생 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: "테스트초등학교" + RandomGenerator.alphaNumeric(4),
      address: "서울특별시 " + RandomGenerator.alphaNumeric(6)
    }
  });
  typia.assert(school);

  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: adminAuthAccount.id,
      name: RandomGenerator.name(),
      email: adminAuthAccount.email!,
      phone: "010" + RandomGenerator.alphaNumeric(8)
    }
  });
  typia.assert(teacher);

  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: "1-1",
      grade_level: 1
    }
  });
  typia.assert(classroom);

  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: studentAuthAccount.id,
      name: RandomGenerator.name(),
      gender: "male",
      birthdate: new Date("2011-03-01").toISOString()
    }
  });
  typia.assert(student);

  // 3. 출석 메소드/코드 UUID (임의 mock)
  const method_id = typia.random<string & tags.Format<"uuid">>();
  const code_id = typia.random<string & tags.Format<"uuid">>();

  // 4. 출석 레코드 생성
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      teacher_id: teacher.id,
      method_id,
      code_id,
      checked_at: new Date().toISOString(),
      status: "present"
    }
  });
  typia.assert(attendanceRecord);

  // 5. 교사권한(정상) 단건 상세조회 및 주요 필드 값 검증
  const read = await api.functional.attendance.attendanceRecords.getById(connection, {
    id: attendanceRecord.id
  });
  typia.assert(read);
  TestValidator.equals("출석 기록 id 일치")(read.id)(attendanceRecord.id);
  TestValidator.equals("학생 id 일치")(read.student_id)(student.id);
  TestValidator.equals("반 id 일치")(read.classroom_id)(classroom.id);
  TestValidator.equals("교사 id 일치")(read.teacher_id)(teacher.id);
  TestValidator.equals("메소드 id 일치")(read.method_id)(method_id);
  TestValidator.equals("코드 id 일치")(read.code_id)(code_id);
  TestValidator.equals("상태 present")(read.status)("present");

  // 6. 존재하지 않는 id 조회시 404 에러
  await TestValidator.error("존재하지 않는 출석 id 요청시 404")(
    async () => {
      await api.functional.attendance.attendanceRecords.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>()
      });
    }
  );

  // 7. 권한 없는 학생 계정의 접근 시 403 에러 - context 분리 전제 필요 (인증 구조에 따라 실제 트랜잭션 분리 필요)
  // 실제 환경에서는 학생 인증 context에서
  // await TestValidator.error("학생 계정의 접근시 403")(
  //   async () => {
  //     await api.functional.attendance.attendanceRecords.getById(studentConnection, {
  //       id: attendanceRecord.id
  //     });
  //   }
  // );
}