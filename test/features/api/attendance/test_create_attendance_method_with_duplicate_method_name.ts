import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";

/**
 * 이미 등록된 출석 방식 명(method_name)으로 새로운 출석 방식을 생성 시도할 때 유니크 제약에 의해 409 오류가 정상적으로 반환되는지 검증합니다.
 *
 * 즉, 같은 method_name이 두 번 이상 등록되지 않는 비즈니스 룰 및 데이터 무결성을 테스트합니다.
 *
 * 1. 출석 방식(method_name: 'QR스캔')을 최초로 정상 생성한다.
 * 2. 동일한 method_name('QR스캔')으로 다시 출석 방식 생성 시도를 한다.
 * 3. 두 번째 생성 시도에서 409 Conflict 오류가 정상적으로 발생하는지 확인한다.
 */
export async function test_api_attendance_test_create_attendance_method_with_duplicate_method_name(
  connection: api.IConnection,
) {
  // 1. 출석 방식(method_name: 'QR스캔')을 최초로 정상 생성
  const createInput: IAttendanceAttendanceMethod.ICreate = {
    method_name: "QR스캔",
    description: "교사가 QR 코드를 보여주면 학생이 이를 스캔하여 출석 처리"
  };
  const created = await api.functional.attendance.attendanceMethods.post(connection, {
    body: createInput,
  });
  typia.assert(created);
  TestValidator.equals("method_name 중복 없는 최초 생성 성공")(created.method_name)("QR스캔");

  // 2. 동일한 method_name('QR스캔')으로 재생성 시도를 하면 409 Conflict 발생 검증
  await TestValidator.error("동일 method_name 중복 생성 시 409 Conflict 발생")(
    async () => {
      await api.functional.attendance.attendanceMethods.post(connection, {
        body: createInput,
      });
    }
  );
}