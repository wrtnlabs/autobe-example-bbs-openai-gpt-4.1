import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";

/**
 * 출석 방식 method_name 유니크 제약 검증
 *
 * - 서로 다른 두 출석 방식(A, B)을 생성 후 B를 A와 동일한 method_name으로 PUT 할 때 409 Conflict가 발생하는지 검증
 * - 중복 없는 method_name으로 수정 시 정상 응답도 추가 확인
 *
 * 1. method_name이 'QR스캔'인 출석 방식 A 생성
 * 2. method_name이 '코드입력'인 출석 방식 B 생성
 * 3. B를 'QR스캔'으로 수정(중복) 시도 – 409 Conflict 오류 필수 발생
 * 4. B를 'NFC스캔'(중복 없는 값)으로 수정하면 정상적으로 변경됨을 검증
 */
export async function test_api_attendance_test_update_attendance_method_to_duplicate_name(
  connection: api.IConnection,
) {
  // 1. method_name: 'QR스캔' 방식 A 생성
  const aMethod = await api.functional.attendance.attendanceMethods.post(connection, {
    body: {
      method_name: "QR스캔",
      description: "QR코드를 통해 출석체크"
    }
  });
  typia.assert(aMethod);

  // 2. method_name: '코드입력' 방식 B 생성
  const bMethod = await api.functional.attendance.attendanceMethods.post(connection, {
    body: {
      method_name: "코드입력",
      description: "임의코드로 출석체크"
    }
  });
  typia.assert(bMethod);

  // 3. B의 method_name을 A의 것과 중복('QR스캔')으로 수정 시 409 Conflict 발생해야 함
  await TestValidator.error("method_name 중복 PUT 409 오류")(() =>
    api.functional.attendance.attendanceMethods.putById(connection, {
      id: bMethod.id,
      body: {
        method_name: "QR스캔",
        description: bMethod.description,
      },
    })
  );

  // 4. B의 method_name을 'NFC스캔'처럼 중복되지 않는 값으로 수정하면 정상 응답
  const updatedB = await api.functional.attendance.attendanceMethods.putById(connection, {
    id: bMethod.id,
    body: {
      method_name: "NFC스캔",
      description: bMethod.description,
    },
  });
  typia.assert(updatedB);
  TestValidator.equals("NFC스캔으로 변경됨")(updatedB.method_name)("NFC스캔");
}