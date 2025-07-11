import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAttendanceCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceCode";

/**
 * 출석 코드(AttendanceAttendanceCode) 정보를 PUT 요청으로 수정하고, 수정 사항이 정상적으로 반영되는지 검증합니다.
 *
 * 본 테스트에서는 수정, 반환 및 DB 갱신을 위해 필수로 다음의 사전 데이터 준비가 필요합니다.
 *
 * 1. 관리자/교사 계정 생성을 위한 인증 계정 생성
 * 2. 출석 코드 및 교실 생성에 필요한 학교 데이터 생성
 * 3. 해당 학교 및 교사로 교실 생성
 * 4. 수정 대상 출석 코드 등록(teacher_id/classroom_id 연계)
 *
 * 이후 출석 코드의 만료일, 활성화 상태, 담당 교사 등 정보 일부를 PUT으로 갱신 요청하고,
 * 결과 응답 객체 및 DB 변화가 기대한대로 반영됐는지 검증합니다.
 *
 * [테스트 시나리오]
 * 1. 인증 계정(관리자/교사) 생성
 * 2. 학교 데이터 생성
 * 3. 교사/학교로 교실 생성
 * 4. 기존 출석 코드 등록
 * 5. 출석 코드의 일부 필드(만료일, is_active, 담당 교사, 코드 값 등) 수정 요청(PUT)
 * 6. 응답 데이터에 수정 사항이 정확히 반영됐는지 검증
 * 7. 새로운 값을 재수정(PUT)하여 한번 더 변경사항 반영 확인
 */
export async function test_api_attendance_test_update_attendance_code_success(
  connection: api.IConnection,
) {
  // 1. 인증 계정(관리자/교사) 생성
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
    }
  });
  typia.assert(teacherAccount);
  
  // 2. 학교 데이터 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()()
    }
  });
  typia.assert(school);

  // 3. 교사/학교로 교실 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherAccount.id,
      name: RandomGenerator.alphaNumeric(5),
      grade_level: typia.random<number & tags.Type<"int32">>()
    }
  });
  typia.assert(classroom);

  // 4. 기존 출석 코드 등록
  const attendanceCode = await api.functional.attendance.attendanceCodes.post(connection, {
    body: {
      classroom_id: classroom.id,
      teacher_id: teacherAccount.id,
      code_value: RandomGenerator.alphaNumeric(6),
      issued_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
      is_active: true
    }
  });
  typia.assert(attendanceCode);

  // 5. 출석 코드의 일부 필드 수정
  const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  const newCodeValue = RandomGenerator.alphaNumeric(6);
  const putBody1 = {
    classroom_id: classroom.id,
    teacher_id: teacherAccount.id,
    code_value: newCodeValue,
    issued_at: attendanceCode.issued_at,
    expires_at: newExpiresAt,
    is_active: false
  } satisfies IAttendanceAttendanceCode.IUpdate;
  const updated = await api.functional.attendance.attendanceCodes.putById(connection, {
    id: attendanceCode.id,
    body: putBody1
  });
  typia.assert(updated);
  TestValidator.equals("수정된 만료일")(updated.expires_at)(newExpiresAt);
  TestValidator.equals("수정된 활성화 상태")(updated.is_active)(false);
  TestValidator.equals("수정된 코드 값")(updated.code_value)(newCodeValue);
  TestValidator.equals("수정된 담당 교사")(updated.teacher_id)(teacherAccount.id);

  // 6. 새로운 값으로 다시 한 번 PUT (활성화 ON, 코드 값 변경)
  const nextCodeValue = RandomGenerator.alphaNumeric(6);
  const putBody2 = {
    classroom_id: classroom.id,
    teacher_id: teacherAccount.id,
    code_value: nextCodeValue,
    issued_at: putBody1.issued_at,
    expires_at: newExpiresAt,
    is_active: true
  } satisfies IAttendanceAttendanceCode.IUpdate;
  const updated2 = await api.functional.attendance.attendanceCodes.putById(connection, {
    id: attendanceCode.id,
    body: putBody2
  });
  typia.assert(updated2);
  TestValidator.equals("2차 수정 활성화")(updated2.is_active)(true);
  TestValidator.equals("2차 코드값")(updated2.code_value)(nextCodeValue);
}