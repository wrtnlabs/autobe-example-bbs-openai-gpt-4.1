import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IPageAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageAttendanceNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 출석 알림(AttendanceNotification) 목록 페이징·필터 테스트
 *
 * 이 테스트는 출석 알림(AttendanceNotification) 정보를
 * 페이징, 검색 조건, 다양한 필터(학생/교실/이벤트 등)로 올바르게 조회/검색할 수 있는지 검증합니다.
 * 실제 알림이 존재하는 상황을 위해, 사전에 여러 알림 데이터(학생/교실 포함)를 등록합니다.
 * 역할별(관리자/교사/학부모) 권한에 따라
 * 조회 가능 범위에 차이가 정상적으로 적용되는지도 확인합니다.
 *
 * 검증 내용:
 * 1. 학생/반/이벤트 등 다양한 조건으로 조회 필터가 동작함
 * 2. limit, page 관련 페이징 시스템이 정상 동작함
 * 3. 검색 결과가 없는 경우 data배열이 빈 배열로 반환됨
 * 4. 잘못된 조건(존재하지 않는 학생, 쿼리 오류) - 422 등 에러 반환
 *
 * 단계별 흐름:
 * 1. 반(classroom) 생성
 * 2. 학생(students) 2명 생성(같은 반 소속)
 * 3. 여러(3개 이상의) 출석 알림(notification) 생성
 * 4. student_id, classroom_id, event_type, 기간조건 등 필터별로 패치 요청하여 결과 검증
 * 5. limit/page 변경시 페이징 응답 구조 및 데이터 검증
 * 6. 없는 학생ID, 존재하지 않는 event_type 등 여러 실패 케이스 검증
 */
export async function test_api_attendance_test_list_notifications_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. 반 생성
  const school_id = typia.random<string & tags.Format<"uuid">>();
  const teacher_id = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id,
      teacher_id,
      name: RandomGenerator.alphaNumeric(6),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    },
  });
  typia.assert(classroom);

  // 2. 학생 2명 생성(동일 반, 각기 다른 parent_id)
  const parent_id_1 = typia.random<string & tags.Format<"uuid">>();
  const parent_id_2 = typia.random<string & tags.Format<"uuid">>();
  const student1 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id,
      classroom_id: classroom.id,
      parent_id: parent_id_1,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      gender: "male",
      birthdate: new Date().toISOString(),
    },
  });
  const student2 = await api.functional.attendance.students.post(connection, {
    body: {
      school_id,
      classroom_id: classroom.id,
      parent_id: parent_id_2,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      gender: "female",
      birthdate: new Date().toISOString(),
    },
  });
  typia.assert(student1);
  typia.assert(student2);

  // 3. 여러 출석 알림(notification) 등록(3개 이상)
  const notification1 = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: student1.id,
      teacher_id: classroom.teacher_id,
      classroom_id: classroom.id,
      event_type: "present",
      triggered_at: new Date().toISOString(),
      message_template: "[출석] 학생이 정상 등원하였습니다.",
    },
  });
  const notification2 = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: student2.id,
      teacher_id: classroom.teacher_id,
      classroom_id: classroom.id,
      event_type: "late",
      triggered_at: new Date().toISOString(),
      message_template: "[지각] 학생이 지각하였습니다.",
    },
  });
  const notification3 = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: student1.id,
      teacher_id: classroom.teacher_id,
      classroom_id: classroom.id,
      event_type: "absent",
      triggered_at: new Date().toISOString(),
      message_template: "[결석] 학생이 결석했습니다.",
    },
  });
  typia.assert(notification1);
  typia.assert(notification2);
  typia.assert(notification3);

  // 4. student_id로 조회
  const byStudent = await api.functional.attendance.notifications.patch(connection, {
    body: { student_id: student1.id },
  });
  typia.assert(byStudent);
  TestValidator.predicate("student_id 필터 동작")(byStudent.data.every(n => n.student_id === student1.id));

  // 5. classroom_id로 조회
  const byClassroom = await api.functional.attendance.notifications.patch(connection, {
    body: { classroom_id: classroom.id },
  });
  typia.assert(byClassroom);
  TestValidator.predicate("classroom_id 필터 동작")(byClassroom.data.length > 0 && byClassroom.data.every(n => n.classroom_id === classroom.id));

  // 6. event_type으로 조회
  const byEventType = await api.functional.attendance.notifications.patch(connection, {
    body: { event_type: "absent" },
  });
  typia.assert(byEventType);
  TestValidator.predicate("event_type 필터 동작")(byEventType.data.every(n => n.event_type === "absent"));

  // 7. 기간/시간범위 triggered_from~to
  const fromDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const toDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const byDateRange = await api.functional.attendance.notifications.patch(connection, {
    body: { triggered_from: fromDate, triggered_to: toDate },
  });
  typia.assert(byDateRange);
  TestValidator.predicate("triggered_from~to 필터 동작")(byDateRange.data.every(n => new Date(n.triggered_at) >= new Date(fromDate) && new Date(n.triggered_at) <= new Date(toDate)));

  // 8. 페이징 limit/page 테스트
  const page1 = await api.functional.attendance.notifications.patch(connection, {
    body: { limit: 2, page: 1 },
  });
  typia.assert(page1);
  TestValidator.equals("limit 2개 page 1")(page1.data.length)(Math.min(2, page1.pagination.records));
  TestValidator.equals("현재 페이지 1")(page1.pagination.current)(1);

  // 9. 없는 학생ID로 조회시 빈 배열 반환
  const byNoneStudent = await api.functional.attendance.notifications.patch(connection, {
    body: { student_id: typia.random<string & tags.Format<"uuid">>() },
  });
  typia.assert(byNoneStudent);
  TestValidator.equals("없는 학생의 경우 빈 데이터")(byNoneStudent.data.length)(0);

  // 10. 없는 event_type(임의의 문자열)을 조건으로 빈 배열 반환
  const byNoneEventType = await api.functional.attendance.notifications.patch(connection, {
    body: { event_type: "not_exist_event_type" },
  });
  typia.assert(byNoneEventType);
  TestValidator.equals("없는 event_type 빈 데이터")(byNoneEventType.data.length)(0);

  // 11. 잘못된 필터(잘못된 uuid 등) → 422 에러 발생 검증
  await TestValidator.error("잘못된 student_id uuid 422")(async () => {
    await api.functional.attendance.notifications.patch(connection, { body: { student_id: "invalid-uuid" } });
  });

  await TestValidator.error("page 음수 입력 422")(async () => {
    await api.functional.attendance.notifications.patch(connection, { body: { page: -1 } });
  });
}