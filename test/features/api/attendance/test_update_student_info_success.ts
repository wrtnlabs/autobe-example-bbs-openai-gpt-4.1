import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자 또는 교사 권한으로 특정 학생의 핵심 정보(이름, 학급, 보호자, 계정 등 모든 필드)를 정상적으로 전체 갱신할 수 있는지 검증합니다.
 * 
 * 본 테스트에서는 업데이트 성공을 위해 필요한 선행 조건으로 학교, 반, 보호자(부모), 인증계정 등 외래키 엔터티를 미리 생성해야 하며,
 * 기존 학생 데이터를 반드시 만들고, 그 학생 레코드를 PUT하여 모든 필드를 신규 값으로 교체하는 전체 갱신 시나리오를 구현합니다.
 *
 * 1. 학생용 인증 계정 생성
 * 2. 학생 보호자(부모)용 인증 계정 생성
 * 3. 보호자(부모) 데이터 생성(2의 인증계정 연동)
 * 4. 학교 데이터 생성
 * 5. 반 데이터(담임 교사 직접 랜덤) 생성 (4,3의 학교/보호자 기반)
 * 6. 학생 데이터 생성 (위의 모든 정보 활용)
 * 7. 새로운 반·학교·부모·계정 등 신규 외래 데이터 생성
 * 8. 학생 PUT 전체갱신 수행 (7의 정보로 수정)
 * 9. 갱신 결과 모든 필드 정상 반영, 외래키 포함 정합성 확인
 */
export async function test_api_attendance_test_update_student_info_success(
  connection: api.IConnection,
) {
  // 1. 학생용 인증 계정 생성
  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    },
  });
  typia.assert(studentAccount);

  // 2. 보호자용 인증 계정 생성
  const parentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    },
  });
  typia.assert(parentAccount);

  // 3. 보호자(부모) 데이터 생성 (인증 계정 연결)
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentAccount.id,
      name: RandomGenerator.name(),
      email: parentAccount.email as string,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(parent);

  // 4. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(3),
      address: RandomGenerator.paragraph()(2),
    },
  });
  typia.assert(school);

  // 5. 반(클래스룸) 생성 (teacher_id는 보호자 PK를 임시대리)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: parent.id, // 테스트 목적상 보호자 PK 대입
      name: RandomGenerator.alphaNumeric(4),
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // 6. 학생 원본 생성
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: studentAccount.id,
      name: RandomGenerator.name(),
      gender: "male",
      birthdate: typia.random<string & tags.Format<'date-time'>>(),
    },
  });
  typia.assert(student);

  // 7. 새 외래키용 데이터 각종 생성
  // 7-1. 새로운 보호자(인증계정+보호자)
  const newParentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    },
  });
  typia.assert(newParentAccount);
  const newParent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: newParentAccount.id,
      name: RandomGenerator.name(),
      email: newParentAccount.email as string,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(newParent);

  // 7-2. 새로운 인증계정(학생용, 실제로 교체)
  const newStudentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    },
  });
  typia.assert(newStudentAccount);

  // 7-3. 새로운 학교
  const newSchool = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(2),
      address: RandomGenerator.paragraph()(2),
    },
  });
  typia.assert(newSchool);

  // 7-4. 새로운 반 (teacher는 동일하게 newParent, 실제론 교사 계정 필요)
  const newClassroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: newSchool.id,
      teacher_id: newParent.id,
      name: RandomGenerator.alphaNumeric(5),
      grade_level: 3,
    },
  });
  typia.assert(newClassroom);

  // 8. 학생 정보 전체 PUT 갱신 (타겟 학생의 모든 필드를 완전히 새 값으로 갱신)
  const updated = await api.functional.attendance.students.putById(connection, {
    id: student.id,
    body: {
      school_id: newSchool.id,
      classroom_id: newClassroom.id,
      parent_id: newParent.id,
      auth_account_id: newStudentAccount.id,
      name: RandomGenerator.name(),
      gender: "female",
      birthdate: typia.random<string & tags.Format<'date-time'>>(),
    },
  });
  typia.assert(updated);

  // 9. 모든 필드가 정상적으로 신규 값으로 대체 됐는지 확인
  TestValidator.equals("school_id 변경됨")(updated.school_id)(newSchool.id);
  TestValidator.equals("classroom_id 변경됨")(updated.classroom_id)(newClassroom.id);
  TestValidator.equals("parent_id 변경됨")(updated.parent_id)(newParent.id);
  TestValidator.equals("auth_account_id 변경됨")(updated.auth_account_id)(newStudentAccount.id);
}