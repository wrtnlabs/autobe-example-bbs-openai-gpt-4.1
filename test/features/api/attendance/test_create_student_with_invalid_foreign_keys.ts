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
 * 학생 생성 시 참조 무결성 위반(FK 오류) 케이스별 422 에러 검증 테스트
 *
 * 학적(출결) 시스템에서 학생을 생성할 때 입력되는 외래키(school_id, classroom_id, parent_id, auth_account_id)가 실제 DB에 존재하지 않는 값일 경우 API가 올바르게 422 에러(참조 무결성 위배)를 반환하는지 검증한다.
 *
 * - 각 외래키(school_id, classroom_id, parent_id, auth_account_id)에 대해 각각 독립적으로 존재하지 않는 UUID를 넣어 학생 생성 시도를 하며, 나머지 값들은 모두 정상 생성된 데이터의 id를 사용한다.
 * - 각 케이스에선 반드시 422 에러가 발생해야 하며, TestValidator.error를 사용해 해당 validation이 동작함을 확인한다.
 *
 * 테스트 절차:
 * 1. 정상 school 데이터 생성
 * 2. 정상 auth_account 데이터 생성
 * 3. 정상 parent 데이터 생성 (auth_account_id 사용)
 * 4. 정상 classroom 데이터 생성 (school_id 사용, teacher_id는 임의 UUID)
 * 5. 정상 학생 등록용 값(name, gender, birthdate 등) 준비
 * 6. 각 FK 항목별로 비정상 UUID 삽입해 학생 생성 시도(총 4케이스)
 *    - 존재하지 않는 school_id
 *    - 존재하지 않는 classroom_id
 *    - 존재하지 않는 parent_id
 *    - 존재하지 않는 auth_account_id
 *    → 모두 422 에러가 발생해야 함
 */
export async function test_api_attendance_test_create_student_with_invalid_foreign_keys(
  connection: api.IConnection,
) {
  // 1. 정상 school 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 정상 auth_account 생성(학생, 보호자 겸용에 각각 필요)
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphabets(32),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);

  // 3. 정상 parent(보호자) 생성
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: authAccount.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parent);

  // 4. 정상 classroom 생성 (school_id 사용, 교사ID는 임의UUID)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 5. 정상 학생 값 준비 (gender는 리터럴 type으로 고정)
  const name = RandomGenerator.name();
  const gender: "male" | "female" = RandomGenerator.pick(["male", "female"]);
  const birthdate = typia.random<string & tags.Format<"date-time">>();

  // 6-1. 존재하지 않는 school_id
  TestValidator.error("존재하지 않는 school_id로 학생 생성시 422 에러")(
    async () => {
      await api.functional.attendance.students.post(connection, {
        body: {
          school_id: typia.random<string & tags.Format<"uuid">>(),
          classroom_id: classroom.id,
          parent_id: parent.id,
          auth_account_id: authAccount.id,
          name,
          gender,
          birthdate,
        } satisfies IAttendanceStudent.ICreate,
      });
    },
  );

  // 6-2. 존재하지 않는 classroom_id
  TestValidator.error("존재하지 않는 classroom_id로 학생 생성시 422 에러")(
    async () => {
      await api.functional.attendance.students.post(connection, {
        body: {
          school_id: school.id,
          classroom_id: typia.random<string & tags.Format<"uuid">>(),
          parent_id: parent.id,
          auth_account_id: authAccount.id,
          name,
          gender,
          birthdate,
        } satisfies IAttendanceStudent.ICreate,
      });
    },
  );

  // 6-3. 존재하지 않는 parent_id
  TestValidator.error("존재하지 않는 parent_id로 학생 생성시 422 에러")(
    async () => {
      await api.functional.attendance.students.post(connection, {
        body: {
          school_id: school.id,
          classroom_id: classroom.id,
          parent_id: typia.random<string & tags.Format<"uuid">>(),
          auth_account_id: authAccount.id,
          name,
          gender,
          birthdate,
        } satisfies IAttendanceStudent.ICreate,
      });
    },
  );

  // 6-4. 존재하지 않는 auth_account_id
  TestValidator.error("존재하지 않는 auth_account_id로 학생 생성시 422 에러")(
    async () => {
      await api.functional.attendance.students.post(connection, {
        body: {
          school_id: school.id,
          classroom_id: classroom.id,
          parent_id: parent.id,
          auth_account_id: typia.random<string & tags.Format<"uuid">>(),
          name,
          gender,
          birthdate,
        } satisfies IAttendanceStudent.ICreate,
      });
    },
  );
}