import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";

/**
 * 존재하지 않는 출석 방식 ID로 조회 시 404 오류 반환 검증
 *
 * 출석 방식 상세 조회(get)에 존재하지 않는 UUID를 전달할 경우, 404 Not Found 오류가 반환되는지 검증합니다.
 * 이는 잘못된/유효하지 않은 접근에 대한 예외처리와 리소스 접근 보안 정책 준수 여부를 확인하기 위한 테스트입니다.
 *
 * [테스트 절차]
 * 1. 랜덤하게 UUID를 생성한다 (존재하지 않는 값).
 * 2. 해당 UUID로 attendanceMethods.getById API를 호출한다.
 * 3. 404 Not Found 오류가 발생하는지 TestValidator.error로 확인한다.
 */
export async function test_api_attendance_attendanceMethods_test_get_attendance_method_detail_not_found(
  connection: api.IConnection,
) {
  // 1. 랜덤하게 UUID(존재하지 않는 값) 생성
  const invalidId = typia.random<string & tags.Format<"uuid">>();

  // 2~3. 존재하지 않는 id로 상세 조회 시 404 오류 검증
  await TestValidator.error("존재하지 않는 출석 방식 id로 404 오류 반환")(
    async () => {
      await api.functional.attendance.attendanceMethods.getById(connection, {
        id: invalidId,
      });
    },
  );
}