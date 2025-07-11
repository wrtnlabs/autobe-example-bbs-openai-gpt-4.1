import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceAttendanceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceRecord";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";

/**
 * 출석 알림 등록 /attendance/notifications.post E2E 테스트
 *
 * 1. 학교, 교사, 교실, 학생, 출석레코드 등 사전 의존 리소스를 선행 생성한다.
 * 2. 정상 입력(존재하는 attendance_record_id, student_id, classroom_id 포함)으로 알림 등록 성공 사례를 검증한다.
 *    - 반환값 타입, 주요 FK 및 payload 값 일치성, typia.assert 체크 등 수행
 * 3. 실패 케이스 테스트:
 *    - 잘못된 FK(없는 student_id/attendance_record_id/classroom_id 등) 시도 및 422 에러 발생 여부
 *    - 같은 출석레코드(attendance_record_id+event_type)로 중복 알림 등록 시 409 에러 발생
 *    - TypeScript가 강제하는 필수 필드 누락/불필요 필드 시도는 스킵(Type-level error이므로 E2E로 불가)
 * 4. 인증 권한 검증 등은 본 테스트 범위 내에서는 불가하므로 생략한다.
 */
export async function test_api_attendance_test_create_notification_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // 1. 사전 의존 관계 리소스 준비
  // 임의 UUID 발급 (학교, 교사, 인증 계정)
  const school_id: string = typia.random<string & tags.Format<"uuid">>();
  const teacher_id: string = typia.random<string & tags.Format<"uuid">>();
  const auth_account_id: string = typia.random<string & tags.Format<"uuid">>();

  // (1) 교실 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id,
      teacher_id,
      name: "1-1",
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // (2) 학생 생성
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id,
      classroom_id: classroom.id,
      auth_account_id,
      name: "홍길동",
      gender: "male",
      birthdate: new Date("2012-03-15").toISOString(),
    } satisfies IAttendanceStudent.ICreate,
  });
  typia.assert(student);

  // (3) 출석 기록 생성
  const method_id = typia.random<string & tags.Format<"uuid">>();
  const attendance_record = await api.functional.attendance.attendanceRecords.post(connection, {
    body: {
      student_id: student.id,
      classroom_id: classroom.id,
      teacher_id,
      method_id,
      checked_at: new Date().toISOString(),
      status: "present",
    } satisfies IAttendanceAttendanceRecord.ICreate,
  });
  typia.assert(attendance_record);

  // 2. 알림 정상 등록 성공케이스
  const notification_payload: IAttendanceNotification.ICreate = {
    attendance_record_id: attendance_record.id,
    student_id: student.id,
    classroom_id: classroom.id,
    teacher_id, // 직접 생성이므로 전달
    event_type: "present",
    triggered_at: new Date().toISOString(),
    message_template: "[출석] {{student}} 학생이 정상 출석 처리되었습니다.",
  };
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: notification_payload,
  });
  typia.assert(notification);
  // 주요 필드 일치성 검증
  TestValidator.equals("attendance_record_id")(notification.attendance_record_id)(notification_payload.attendance_record_id);
  TestValidator.equals("student_id")(notification.student_id)(notification_payload.student_id);
  TestValidator.equals("classroom_id")(notification.classroom_id)(notification_payload.classroom_id);
  TestValidator.equals("teacher_id")(notification.teacher_id)(notification_payload.teacher_id);
  TestValidator.equals("event_type")(notification.event_type)(notification_payload.event_type);
  TestValidator.equals("message_template")(notification.message_template)(notification_payload.message_template);

  // 3-1. 잘못된 FK(존재하지 않는 값) 입력 → 422 에러
  await TestValidator.error("존재하지 않는 student_id는 422")(async () => {
    await api.functional.attendance.notifications.post(connection, {
      body: {
        ...notification_payload,
        student_id: typia.random<string & tags.Format<"uuid">>(), // 존재하지 않는 학생
      },
    });
  });
  await TestValidator.error("존재하지 않는 attendance_record_id는 422")(async () => {
    await api.functional.attendance.notifications.post(connection, {
      body: {
        ...notification_payload,
        attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  });
  await TestValidator.error("존재하지 않는 classroom_id는 422")(async () => {
    await api.functional.attendance.notifications.post(connection, {
      body: {
        ...notification_payload,
        classroom_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  });

  // 3-2. 동일 (attendance_record_id + event_type) 의 중복 등록 → 409 에러
  await TestValidator.error("중복 알림 등록은 409")(async () => {
    await api.functional.attendance.notifications.post(connection, {
      body: notification_payload,
    });
  });

  // (참고) 필수 필드 누락/불필요 값 포함 등 타입 오류는 TS 컴파일 단계에서 차단되므로 E2E에선 별도 테스트하지 않음
  // (참고) 인증 권한 부족(403) 등은 별도 인증 API가 없으므로 시뮬레이션 생략
}