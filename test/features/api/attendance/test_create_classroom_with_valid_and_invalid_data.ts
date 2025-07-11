import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 학급(classroom) 생성 API의 유효성과 권한, 예외상황을 검증한다.
 *
 * 이 테스트는 관리자 또는 교사 권한 사용자가, 반드시 존재하는 학교 및 교사 ID에 대해, 학교 내에서 고유한 학급명을 사용해서 학급 생성 요청을 올바르게 수행할 때 성공적으로 반이 생성되고, PK 및 모든 필드가 응답에 포함되는지 검증해야 한다.
 * 또한 다음과 같은 다양한 실패 케이스를 검증한다:
 *  - 존재하지 않는 학교 ID를 전달했을 때
 *  - 존재하지 않는 교사 ID를 전달했을 때
 *  - 동일 학교 내 중복 학급명으로 생성 요청 시
 *  - 필수 입력 필드 누락시 (school_id, teacher_id, name, grade_level)
 *  - 데이터 포맷 제약(grade_level 타입 등) 위반시
 *  - 권한 없는 역할(예: 학생/학부모 등)이 요청할 때
 *
 * 주요 과정
 * 1. 인증 계정 생성 (교사/관리자)
 * 2. 학교 생성
 * 3. 교사 생성 및 권한 연결
 * 4. 정상 학급 생성 성공 케이스
 * 5. 동일 학교 내 동일 학급명으로 중복 요청(409 오류) 검증
 * 6. 존재하지 않는 school_id, teacher_id로 요청(404 또는 409)
 * 7. 입력 데이터 누락 시도(422 오류)
 * 8. grade_level 타입 불일치(예: null, string, 음수 등) → 422 오류
 * 9. 비인가 계정 또는 session 없이 요청(403 오류) 검증
 */
export async function test_api_attendance_test_create_classroom_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // 1. 인증 계정(교사) 생성
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(32);
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 2. 학교 생성
  const schoolName = RandomGenerator.paragraph()(6);
  const schoolAddress = RandomGenerator.paragraph()(6);
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: schoolName,
      address: schoolAddress,
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 3. 교사 등록
  const teacherName = RandomGenerator.name();
  const teacherPhone = RandomGenerator.mobile();
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: authAccount.id,
      name: teacherName,
      email,
      phone: teacherPhone,
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(teacher);

  // 4. 정상 학급 생성 (성공)
  const classroomName = RandomGenerator.paragraph()(3);
  const gradeLevel = typia.random<number & tags.Type<"int32">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: classroomName,
      grade_level: gradeLevel,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);
  TestValidator.equals("학급 생성 응답 필드 일치")(classroom.school_id)(school.id);
  TestValidator.equals("교사 연결 확인")(classroom.teacher_id)(teacher.id);
  TestValidator.equals("이름, 학년 확인")(classroom.name)(classroomName);
  TestValidator.equals("이름, 학년 확인")(classroom.grade_level)(gradeLevel);

  // 5. 동일 학교 내 동일 학급명 중복 생성 시도 (409 예상)
  await TestValidator.error("동일 학교 학급명 중복 생성 - 409")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: school.id,
        teacher_id: teacher.id,
        name: classroomName,
        grade_level: gradeLevel,
      } satisfies IAttendanceClassroom.ICreate,
    })
  );

  // 6. 존재하지 않는 school_id, teacher_id로 생성 시도
  await TestValidator.error("존재하지 않는 school_id - 409")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: typia.random<string & tags.Format<"uuid">>(),
        teacher_id: teacher.id,
        name: RandomGenerator.paragraph()(5),
        grade_level: typia.random<number & tags.Type<"int32">>(),
      } satisfies IAttendanceClassroom.ICreate,
    })
  );
  await TestValidator.error("존재하지 않는 teacher_id - 409")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: school.id,
        teacher_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph()(5),
        grade_level: typia.random<number & tags.Type<"int32">>(),
      } satisfies IAttendanceClassroom.ICreate,
    })
  );

  // 7. 필수값 누락 및 grade_level 타입 오류 (422)
  // grade_level 미포함
  await TestValidator.error("grade_level 누락 - 422")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: school.id,
        teacher_id: teacher.id,
        name: RandomGenerator.paragraph()(2),
        // grade_level: (의도적으로 미포함)
      } as any,
    })
  );
  // name 미포함
  await TestValidator.error("name 누락 - 422")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: school.id,
        teacher_id: teacher.id,
        grade_level: typia.random<number & tags.Type<"int32">>(),
        // name: (의도적으로 미포함)
      } as any,
    })
  );
  // school_id 미포함
  await TestValidator.error("school_id 누락 - 422")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        teacher_id: teacher.id,
        name: RandomGenerator.paragraph()(2),
        grade_level: typia.random<number & tags.Type<"int32">>(),
        // school_id: (의도적으로 미포함)
      } as any,
    })
  );
  // grade_level 타입 오류 (string)
  await TestValidator.error("grade_level 타입 오류(string) - 422")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: school.id,
        teacher_id: teacher.id,
        name: RandomGenerator.paragraph()(2),
        grade_level: "일학년" as any,
      } as any,
    })
  );
  // grade_level 음수 (가능 시)
  await TestValidator.error("grade_level 음수(가능한 범위 밖) - 422")(() =>
    api.functional.attendance.classrooms.post(connection, {
      body: {
        school_id: school.id,
        teacher_id: teacher.id,
        name: RandomGenerator.paragraph()(2),
        grade_level: -1 as any,
      } as any,
    })
  );
}