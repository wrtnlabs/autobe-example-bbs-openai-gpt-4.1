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
 * 출석 레코드 수정 에러 응답(권한/존재하지 않는 ID/입력 오류) E2E 통합 검증
 *
 * 이 테스트는 아래 상황별로 API가 적절한 에러 코드를 반환하는지 통합적으로 검증합니다.
 *
 * 1. 준비 단계: 신규 학교, 교사(2명), 학생, 학생계정, 부모계정, 반, 출석기록 생성
 * 2. "권한 없음": 타 교사/학생/부모가 출석 기록 수정 시도 시 403 Forbidden 검증
 * 3. "존재하지 않는 ID": 무작위 ID에 PUT 시도 시 404 Not Found 검증
 * 4. "입력 오류": FK(학생/반/교사/방식) 무효 값 입력 시 409 혹은 422 에러 처리 검증
 */
export async function test_api_attendance_test_update_attendance_record_with_invalid_or_forbidden_access(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(school);

  // 2. 교사(담임), 타 교사, 학생, 학생 계정, 부모 계정 준비
  // - 담임교사(권한 있는 교사)
  const authOwner = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: "passwordhash-1",
    },
  });
  typia.assert(authOwner);
  const ownerTeacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: authOwner.id,
      name: "담임교사",
      email: authOwner.email!,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(ownerTeacher);

  // - 타 교사(권한 없는 교사)
  const authOther = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: "passwordhash-2",
    },
  });
  typia.assert(authOther);
  const otherTeacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: authOther.id,
      name: "타교사",
      email: authOther.email!,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(otherTeacher);

  // - 학생 계정
  const authStudent = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: "passwordhash-3",
    },
  });
  typia.assert(authStudent);
  // - 부모 계정
  const authParent = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password_hash: "passwordhash-4",
    },
  });
  typia.assert(authParent);

  // - 반(클래스)
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: ownerTeacher.id,
      name: "1-가반",
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // - 학생 등록
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      parent_id: undefined,
      auth_account_id: authStudent.id,
      name: "홍길동",
      gender: "male",
      birthdate: new Date().toISOString(),
    },
  });
  typia.assert(student);

  // 3. 출석기록 1건(정상 상태, 담임교사로 생성)
  const attendanceRecord = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      teacher_id: ownerTeacher.id,
      method_id: typia.random<string & tags.Format<'uuid'>>(),
      checked_at: new Date().toISOString(),
      status: "present",
      exception_reason: null,
    },
  });
  typia.assert(attendanceRecord);

  // 2-1. "권한 없음" - 타 교사
  TestValidator.error("타 교사 권한 없음(403)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: attendanceRecord.id,
      body: {
        ...attendanceRecord,
        status: "late",
      },
    })
  );
  // 2-2. "권한 없음" - 학생
  TestValidator.error("학생 권한 없음(403)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: attendanceRecord.id,
      body: {
        ...attendanceRecord,
        status: "late",
      },
    })
  );
  // 2-3. "권한 없음" - 부모
  TestValidator.error("부모 권한 없음(403)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: attendanceRecord.id,
      body: {
        ...attendanceRecord,
        status: "late",
      },
    })
  );

  // 3. "존재하지 않는 출석 기록" 404
  TestValidator.error("존재하지 않는 출석기록(404)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: typia.random<string & tags.Format<'uuid'>>(),
      body: {
        ...attendanceRecord,
        status: "late",
      },
    })
  );

  // 4. "입력 오류(FK 무효)" 409/422
  TestValidator.error("존재하지 않는 학생ID(409/422)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: attendanceRecord.id,
      body: {
        ...attendanceRecord,
        student_id: typia.random<string & tags.Format<'uuid'>>(),
      },
    })
  );
  TestValidator.error("존재하지 않는 반ID(409/422)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: attendanceRecord.id,
      body: {
        ...attendanceRecord,
        classroom_id: typia.random<string & tags.Format<'uuid'>>(),
      },
    })
  );
  TestValidator.error("존재하지 않는 교사ID(409/422)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: attendanceRecord.id,
      body: {
        ...attendanceRecord,
        teacher_id: typia.random<string & tags.Format<'uuid'>>(),
      },
    })
  );
  TestValidator.error("존재하지 않는 방식ID(409/422)")(() =>
    api.functional.attendance.attendanceRecords.putById(connection, {
      id: attendanceRecord.id,
      body: {
        ...attendanceRecord,
        method_id: typia.random<string & tags.Format<'uuid'>>(),
      },
    })
  );
}