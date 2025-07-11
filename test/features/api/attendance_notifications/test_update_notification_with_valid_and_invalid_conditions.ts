import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";

/**
 * 출석 알림 이벤트의 수정 API를 종합적으로 검증합니다.
 *
 * - 정상 케이스 :
 *   1. 사전에 알림 이벤트를 생성 후, event_type, message_template, teacher_id, classroom_id 등의 atomic 필드별 값을 여러 번 수정하며, 실제로 응답 데이터에서 DB 변경(값 갱신)이 실제 이뤄졌는지 검사합니다.
 *   2. 모든 응답은 스키마에 부합하는지 typia.assert로 검증합니다.
 *   3. (어플리케이션 정책상 구현된 경우) 변경시 감사로그 등 정책도 서버 로직에 따라 자동 실행되어야 하며, 실제 응답의 값이 정확히 반영되는지 확인합니다.
 *
 * - 실패/에러 케이스 :
 *   1. 알림이 이미 '전달 불가' 상태거나 '전달 완료' 상태(정책상 수정 불가 상태)에서 수정을 시도하면 4xx 에러가 발생해야 합니다. (만약 해당 정책이 실제 구현돼 있지 않으면 스킵하십시오)
 *   2. 권한 없는 사용자가 수정을 시도하면 403 에러를 던져야 합니다. (권한 검증 API 부재 시 스킵)
 *   3. 존재하지 않는 알림 id로 수정을 시도하면 404 에러가 발생해야 합니다.
 *   4. 잘못된 값, 필수값 누락 등 유효성 위반 입력값으로 요청할 경우 422 에러가 발생해야 합니다.
 *   (ex: FK UUID 포맷 아님, 존재하지 않는 FK, allowed enum 아닌 event_type 등)
 */
export async function test_api_attendance_notifications_test_update_notification_with_valid_and_invalid_conditions(
  connection: api.IConnection,
) {
  // 1. 사전 알림 생성
  const createBody = {
    attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
    student_id: typia.random<string & tags.Format<"uuid">>(),
    classroom_id: typia.random<string & tags.Format<"uuid">>(),
    event_type: "present",
    triggered_at: new Date().toISOString(),
    message_template: "[TEST] 출석 알림 템플릿",
    teacher_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IAttendanceNotification.ICreate;
  const notification = await api.functional.attendance.notifications.post(connection, { body: createBody });
  typia.assert(notification);

  // 2. 정상: event_type 변경
  const update1 = await api.functional.attendance.notifications.putById(connection, {
    id: notification.id,
    body: { event_type: "late" },
  });
  typia.assert(update1);
  TestValidator.equals("event_type 갱신됨")(update1.event_type)("late");

  // 3. 정상: message_template, teacher_id, classroom_id, triggered_at 일괄 변경
  const newTeacherId = typia.random<string & tags.Format<"uuid">>();
  const newClassroomId = typia.random<string & tags.Format<"uuid">>();
  const newTime = new Date(Date.now() + 60000).toISOString();
  const update2 = await api.functional.attendance.notifications.putById(connection, {
    id: notification.id,
    body: {
      message_template: "[UPDATED] 템플릿 내용",
      teacher_id: newTeacherId,
      classroom_id: newClassroomId,
      triggered_at: newTime,
    },
  });
  typia.assert(update2);
  TestValidator.equals("message_template 갱신됨")(update2.message_template)("[UPDATED] 템플릿 내용");
  TestValidator.equals("teacher_id 변경됨")(update2.teacher_id)(newTeacherId);
  TestValidator.equals("classroom_id 변경됨")(update2.classroom_id)(newClassroomId);
  TestValidator.equals("triggered_at 변경됨")(update2.triggered_at)(newTime);

  // 4. 존재하지 않는 알림 id로 수정 시도 → 404
  await TestValidator.error("존재하지 않는 id 404")(() =>
    api.functional.attendance.notifications.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: { event_type: "present" },
    }),
  );

  // 5. 유효하지 않은 값(타입/포맷/필수값 누락 등) → 422
  await TestValidator.error("유효하지 않은 값 422")(() =>
    api.functional.attendance.notifications.putById(connection, {
      id: notification.id,
      body: { event_type: "NOT_ALLOWED_VALUE" },
    }),
  );
  await TestValidator.error("필수값 누락 422")(() =>
    api.functional.attendance.notifications.putById(connection, {
      id: notification.id,
      body: {},
    }),
  );
}