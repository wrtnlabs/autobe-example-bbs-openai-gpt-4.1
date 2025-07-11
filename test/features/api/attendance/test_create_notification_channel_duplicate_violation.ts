import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 동일 (student_id, parent_id, channel_type) 조합의 notification channel 중복 생성 방지 테스트
 *
 * 이 테스트는 출결 알림 채널 생성 시 (student_id, parent_id, channel_type)의 유니크 제약 조건이 잘 적용되어 있는지 검증한다.
 *
 * [테스트 시나리오]
 * 1. 출결 테스트용 student(학생)와 parent(학부모)를 생성한다.
 * 2. 위 학생/학부모 조합과 특정 channel_type(app_push)로 notification channel을 정상적으로 생성한다.
 * 3. 동일한 student, parent, channel_type 조합으로 notification channel을 한 번 더 생성 요청(POST)한다.
 * 4. 두 번째 요청이 unique 제약 위반으로 인해 409 Conflict 에러를 반환하는지 확인한다.
 *
 * (비고) preference_order, is_enabled 등 부가 필드는 중복여부 판단에 영향 없음. 오로지 (student_id, parent_id, channel_type) 조합으로 판단
 */
export async function test_api_attendance_test_create_notification_channel_duplicate_violation(
  connection: api.IConnection,
) {
  // 1. 출결 테스트용 보호자(parent) 생성
  const parentInput = {
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  } satisfies IAttendanceParent.ICreate;
  const parent = await api.functional.attendance.parents.post(connection, { body: parentInput });
  typia.assert(parent);

  // 2. 출결 테스트용 학생(student) 생성
  const studentInput = {
    school_id: typia.random<string & tags.Format<"uuid">>(),
    classroom_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: parent.id,
    auth_account_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    gender: RandomGenerator.pick(["male", "female"]),
    birthdate: typia.random<string & tags.Format<"date-time">>(),
  } satisfies IAttendanceStudent.ICreate;
  const student = await api.functional.attendance.students.post(connection, { body: studentInput });
  typia.assert(student);

  // 3. 정상 notification channel 생성
  const notificationChannelInput = {
    student_id: student.id,
    parent_id: parent.id,
    channel_type: "app_push",
    is_enabled: true,
    preference_order: 1,
  } satisfies IAttendanceNotificationChannel.ICreate;
  const notificationChannel = await api.functional.attendance.notificationChannels.post(connection, { body: notificationChannelInput });
  typia.assert(notificationChannel);

  // 4. 동일 정보로 notification channel을 한번 더 생성 시도 → 409 CONFLICT (unique constraint violation)
  await TestValidator.error("동일 student-parent-channel_type 중복생성시 409 반환")(
    () => api.functional.attendance.notificationChannels.post(connection, { body: notificationChannelInput })
  );
}