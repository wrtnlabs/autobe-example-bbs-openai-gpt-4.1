import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * [알림 채널 생성 정상 플로우 검증]
 *
 * - 유효한 student_id, parent_id, channel_type, is_enabled, preference_order 조합으로 알림 채널을 생성
 * - 사전에 참조되는 student, parent 엔터티를 실제로 생성하여 PK(FK) 제약 및 유일성 조건 준수
 * - 올바른 파라미터 입력 시 정상적으로 새로운 attendance_notification_channel 객체가 생성되어 반환되는지 검증
 *
 * 세부 절차:
 * 1. 학부모(IAttendanceParent) 생성 (FK parent_id 용)
 * 2. 학생(IAttendanceStudent) 생성 (FK student_id 및 parent_id 용)
 * 3. notification_channel 생성 요청 (존재하는 student_id, parent_id, channel_type, is_enabled, preference_order 등)
 * 4. 반환된 attendance_notification_channel 값의 모든 주요 필드가 입력값과 일치하는지 검증
 */
export async function test_api_attendance_test_create_notification_channel_success(
  connection: api.IConnection,
) {
  // 1. 학부모(보호자) 생성
  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(parent);

  // 2. 학생 엔티티 생성 (parent_id 및 FK 채우기)
  const student = await api.functional.attendance.students.post(connection, {
    body: {
      school_id: typia.random<string & tags.Format<"uuid">>(),
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      parent_id: parent.id,
      auth_account_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      gender: RandomGenerator.pick(["male", "female"]),
      birthdate: typia.random<string & tags.Format<"date-time">>(),
    },
  });
  typia.assert(student);

  // 3. 알림 채널 생성 요청
  const input = {
    student_id: student.id,
    parent_id: parent.id,
    channel_type: RandomGenerator.pick(["app_push", "sms", "email"]),
    is_enabled: true,
    preference_order: typia.random<number & tags.Type<"int32">>(),
  };
  const notificationChannel = await api.functional.attendance.notificationChannels.post(connection, {
    body: input,
  });
  typia.assert(notificationChannel);

  // 4. 반환값 유효성 및 입력값 비교 검증
  TestValidator.equals("student_id 일치")(notificationChannel.student_id)(input.student_id);
  TestValidator.equals("parent_id 일치")(notificationChannel.parent_id)(input.parent_id);
  TestValidator.equals("channel_type 일치")(notificationChannel.channel_type)(input.channel_type);
  TestValidator.equals("is_enabled 일치")(notificationChannel.is_enabled)(input.is_enabled);
  TestValidator.equals("preference_order 일치")(notificationChannel.preference_order)(input.preference_order);
}