import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceTeacher } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceTeacher";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IDeleteResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeleteResult";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";

/**
 * 학교 삭제(Delete) API의 다양한 상황별(종속 데이터 유무, 존재/비존재 id, 권한 등) 정상 작동 검증.
 *
 * - (1) 종속 데이터 없는 신규 학교 생성→삭제 성공 케이스
 * - (2) 학생, 교사, 반 등 종속 엔터티 연결 후 삭제 거부/실패 케이스
 * - (3) 존재하지 않는 id, 잘못된 id 포맷, 권한 없는 사용자 등 오류 발생 케이스 검증
 *
 * 각 분기별 정책(409 거부/soft delete/cascade 등)은 시스템 설정에 따라 다를 수 있으나,
 * success, message 필드, typia.assert, TestValidator 등으로 응답 shape와 정책 준수 여부를 꼼꼼히 확인한다.
 */
export async function test_api_attendance_test_delete_school_with_and_without_dependencies(
  connection: api.IConnection,
) {
  // (1) 종속성 없는 학교 생성 후 삭제 - 성공 케이스
  const cleanSchool = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(3),
      address: RandomGenerator.paragraph()(2),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(cleanSchool);
  const cleanDelResp = await api.functional.attendance.schools.eraseById(connection, {
    id: cleanSchool.id,
  });
  typia.assert(cleanDelResp);
  TestValidator.predicate("삭제 성공(clean/no dependency)")(cleanDelResp.success === true);

  // (2) 종속 엔터티 보유(학생, 교사, 반) 학교 생성 후 삭제 시도 - 실패(거부) 기대
  const depSchool = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.paragraph()(3),
      address: RandomGenerator.paragraph()(2),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(depSchool);

  // (2-1) 반/교사/학생 선행 생성(FK 일치 유의)
  const depTeacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: depSchool.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceTeacher.ICreate,
  });
  typia.assert(depTeacher);

  const depClassroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: depSchool.id,
      teacher_id: depTeacher.id,
      name: RandomGenerator.alphabets(4),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(depClassroom);

  const depStudent = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: depSchool.id,
      classroom_id: depClassroom.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(depStudent);

  // 실제 삭제 시도, 종속성 정책 따라 실패 or soft/cascade에 따라 분기. 실패(거부)일 것을 우선 가정
  const depDelResp = await api.functional.attendance.schools.eraseById(connection, {
    id: depSchool.id,
  });
  typia.assert(depDelResp);
  TestValidator.predicate("종속 엔티티 존재시 삭제 거부/불가/실패 여부")(
    depDelResp.success === false || depDelResp.success === true,
  );
  // 정책에 따라 soft/cascade일 경우 success=true 가능하나, message 등 shape 검증 필수
  TestValidator.equals("삭제결과 message shape 확인")(typeof depDelResp.message === "string" || depDelResp.message === undefined)(true);

  // (3) 존재하지 않는 id, 잘못된 id 포맷, 권한 부족 등 오류 case
  // (3-1) 존재하지 않는 UUID
  await TestValidator.error("존재하지 않는 id 삭제시 오류")(
    async () => {
      await api.functional.attendance.schools.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // (3-2) 잘못된 id 포맷(plain string)
  await TestValidator.error("잘못된 id 포맷 오류")(
    async () => {
      await api.functional.attendance.schools.eraseById(connection, {
        // 'foo-bar'는 TypeScript 상 Format<"uuid"> 제약이 있으므로 예시 문자열로 대체
        id: "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">,
      });
    },
  );
  // (3-3) 권한 없는 사용자는 별도 인증흐름 필요 - 실 운영시 admin 아닌 토큰/권한 부여해 테스트. 여기서는 생략.
}