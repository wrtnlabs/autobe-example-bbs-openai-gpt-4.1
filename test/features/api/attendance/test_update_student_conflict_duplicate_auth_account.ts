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
 * 이미 다른 학생에게 할당되어 있는 auth_account_id로 학생 정보를 업데이트할 경우 409 Conflict가 발생해야 하는지 테스트한다.
 * 
 * 이 비즈니스 로직 검증을 위해 다음과 같은 시나리오로 테스트를 수행한다.
 *
 * 1. 인증계정(auth_account) 2개를 생성한다.
 * 2. 학교(school) 1개와 반(classroom) 1개, 부모(parent) 1개를 생성한다.
 * 3. 서로 다른 인증계정으로 학생 2명을 생성한다.
 * 4. 2번 학생의 auth_account_id를 1번 학생의 auth_account_id로 바꿔 putById API로 업데이트를 시도한다.
 *    - 이때 이미 해당 auth_account_id가 다른 학생에 연결돼 있으므로 409 Conflict가 발생해야 한다.
 */
export async function test_api_attendance_test_update_student_conflict_duplicate_auth_account(
  connection: api.IConnection,
) {
  // 1. 인증계정 2개 생성
  const authAccount1 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed_pw_1",
    },
  });
  typia.assert(authAccount1);

  const authAccount2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed_pw_2",
    },
  });
  typia.assert(authAccount2);

  // 2. 학교 및 반, 학부모 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: "테스트초등학교" + typia.random<string>(),
      address: "서울시 종로구" + typia.random<string>(),
    },
  });
  typia.assert(school);

  // 실교사 엔티티 API가 없으므로, 랜덤 uuid를 teacher_id로 활용
  const teacherId = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: "1학년 1반",
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  const parentAuthAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed_pw_parent",
    },
  });
  typia.assert(parentAuthAccount);

  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: parentAuthAccount.id,
      name: "학부모" + typia.random<string>(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: "010" + typia.random<string>(),
    },
  });
  typia.assert(parent);

  // 3. 학생 2명 등록
  const student1 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: authAccount1.id,
      name: "홍길동",
      gender: "male",
      birthdate: new Date("2015-03-01").toISOString(),
    },
  });
  typia.assert(student1);

  const student2 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: parent.id,
      auth_account_id: authAccount2.id,
      name: "김철수",
      gender: "male",
      birthdate: new Date("2015-08-01").toISOString(),
    },
  });
  typia.assert(student2);

  // 4. 2번 학생의 auth_account_id를 1번 학생의 것으로 바꾸고 업데이트 시도 → 409 기대
  await TestValidator.error("다른 학생의 auth_account_id로 업데이트시 409 반환 여부")(
    async () => {
      await api.functional.attendance.students.putById(connection, {
        id: student2.id,
        body: {
          school_id: student2.school_id,
          classroom_id: student2.classroom_id,
          parent_id: student2.parent_id,
          auth_account_id: student1.auth_account_id, // 충돌 발생
          name: student2.name,
          gender: student2.gender,
          birthdate: student2.birthdate,
        },
      });
    },
  );
}