import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";

/**
 * 종속된 클래스를 가진 교사 삭제 거부 검증
 *
 * 교사 엔터티가 클래스룸에 의해 참조(담임 등으로 연결)되어 있을 때 삭제가 허용되지 않아야 하는 비즈니스 규칙을 검증한다.
 *
 * 1. 신규 teacher 생성
 * 2. 위 teacher와 연결된 classroom 생성 (teacher_id → 연결)
 * 3. 해당 teacher의 삭제 시도 → 종속 관계로 인한 삭제 거부(409 또는 403 등 정책 에러)
 * 4. 올바른 정책 에러가 발생했는지 검증
 */
export async function test_api_attendance_test_delete_teacher_with_linked_classroom_violation(
  connection: api.IConnection,
) {
  // 1. teacher 생성
  const teacherInput: IAttendanceTeacher.ICreate = {
    school_id: typia.random<string & tags.Format<"uuid">>(),
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  };
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: teacherInput,
  });
  typia.assert(teacher);

  // 2. 연결된 classroom 생성 (teacher_id → 방금 만든 teacher의 id)
  const classroomInput: IAttendanceClassroom.ICreate = {
    school_id: teacher.school_id,
    teacher_id: teacher.id,
    name: RandomGenerator.alphaNumeric(6),
    grade_level: 1,
  };
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: classroomInput,
  });
  typia.assert(classroom);

  // 3. 해당 teacher 삭제 요청 (삭제 거부 정책 검증)
  await TestValidator.error("teacher with linked classroom 삭제 시도시 정책 위반 에러")(
    async () => {
      await api.functional.attendance.teachers.eraseById(connection, {
        id: teacher.id,
      });
    },
  );
}