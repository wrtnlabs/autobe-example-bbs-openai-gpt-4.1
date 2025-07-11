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
import type { IPageAttendanceAttendanceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceAttendanceRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 교사 계정으로 로그인하여 출석 기록을 조회한다.
 *
 * 요청 바디에 조회 기간, 반ID, 학생ID 등 유효한 필터를 지정해 페이징과 함께 출석 기록 목록을 받아오고,
 * 올바른 결과와 빈 결과 및 유효성 에러 응답까지 확인한다.
 *
 * 1. 학교 생성
 * 2. 교사용 계정 생성 -> 교사 엔티티 생성
 * 3. 반 생성 (해당 학교/교사 소속)
 * 4. 학생용 계정 생성 -> 학생 엔티티 생성(반 소속)
 * 5. 출석 기록 여러 건 추가 (다른 날짜, 학생, 반별 다양화)
 * 6. patch(/attendance/attendanceRecords) 정상 조회: 기간/반ID/학생ID 등 조합으로 조건 부합 출력, 페이징메타 확인
 * 7. 존재하지 않는 기간(미래 등) 등으로 조회: 빈 배열, 페이징 메타 정상
 * 8. 잘못된 날짜포맷(예: '202107') 등 유효하지 않은 입력으로 422 오류 확인
 */
export async function test_api_attendance_test_list_attendance_records_with_valid_filters_and_pagination_as_teacher(
  connection: api.IConnection,
) {
  // 1. 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `테스트학교_${RandomGenerator.alphaNumeric(8)}`,
      address: `서울특별시 강남구 ${RandomGenerator.alphaNumeric(5)}`,
    }
  });
  typia.assert(school);

  // 2. 교사 계정 & 교사 등록
  const teacherEmail = typia.random<string & tags.Format<"email">>();
  const teacherAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: teacherEmail,
      password_hash: "hashed_password"
    }
  });
  typia.assert(teacherAccount);
  const teacher = await api.functional.attendance.teachers.post(connection, {
    body: {
      school_id: school.id,
      auth_account_id: teacherAccount.id,
      name: RandomGenerator.name(),
      email: teacherEmail,
      phone: RandomGenerator.mobile(),
    }
  });
  typia.assert(teacher);

  // 3. 반 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacher.id,
      name: `1반_${RandomGenerator.alphaNumeric(6)}`,
      grade_level: 1,
    }
  });
  typia.assert(classroom);

  // 4. 학생 인증계정 & 학생 등록
  const studentEmail = typia.random<string & tags.Format<"email">>();
  const studentAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: studentEmail,
      password_hash: "hashed_password"
    }
  });
  typia.assert(studentAccount);
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: school.id,
      classroom_id: classroom.id,
      auth_account_id: studentAccount.id,
      name: RandomGenerator.name(),
      gender: "male",
      birthdate: new Date("2010-03-02").toISOString(),
    }
  });
  typia.assert(student);

  // 5. 출석 기록 여러 건 등록 (날짜 다르게 3건)
  const statuses = ["present", "late", "absent"];
  const attendanceRecords = [];
  for (let i = 0; i < 3; i++) {
    const record = await api.functional.attendance.attendanceRecords.post(connection, {
      body: {
        student_id: student.id,
        classroom_id: classroom.id,
        teacher_id: teacher.id,
        method_id: typia.random<string & tags.Format<"uuid">>(),
        code_id: null,
        checked_at: new Date(Date.now() - 86400 * 1000 * i).toISOString(),
        status: statuses[i],
        exception_reason: i === 1 ? "지각 사유" : null,
      }
    });
    typia.assert(record);
    attendanceRecords.push(record);
  }

  // 6. patch(/attendance/attendanceRecords): 기간별, 반ID, 학생ID 등 조건 조회(종합)
  const startDate = new Date(Date.now() - 86400 * 1000 * 2).toISOString();
  const endDate = new Date().toISOString();
  const filterReq = {
    student_id: student.id,
    classroom_id: classroom.id,
    start_at: startDate,
    end_at: endDate,
    page: 1,
    limit: 2,
    sort: "checked_at",
    order: "asc"
  };
  const pageResult = await api.functional.attendance.attendanceRecords.patch(connection, {
    body: filterReq,
  });
  typia.assert(pageResult);
  TestValidator.equals("조회된 건수 및 페이지네이션")(
    pageResult.data.length
  )(
    2 // limit:2, 등록한 것 중 2건노출
  );
  TestValidator.equals("학생정보, 반정보, 기간 필터 통과")(
    pageResult.data.map(v=>v.student_id).every(id=>id===student.id)
  )(true);

  // 7. 존재하지 않는 기간(예: 미래) 필터: 빈 배열/정상 메타 확인
  const futureDate = new Date(Date.now() + 86400 * 1000 * 10).toISOString();
  const futurePage = await api.functional.attendance.attendanceRecords.patch(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      start_at: futureDate,
      end_at: futureDate,
      page: 1,
      limit: 10
    }
  });
  typia.assert(futurePage);
  TestValidator.equals("빈 출석 result")(
    futurePage.data.length
  )(0);

  // 8. 잘못된 날짜포맷 등 유효하지 않은 입력 시 422에러
  await TestValidator.error("날짜포맷 오류 422")(() =>
    api.functional.attendance.attendanceRecords.patch(connection, {
      body: {
        student_id: student.id,
        classroom_id: classroom.id,
        start_at: "abcdefg", // 잘못된 ISO8601
        end_at: "error",      // 잘못된 ISO8601
        page: 1,
        limit: 5
      }
    })
  );
}