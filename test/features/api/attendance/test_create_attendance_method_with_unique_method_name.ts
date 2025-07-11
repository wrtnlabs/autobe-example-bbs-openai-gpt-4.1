import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";

/**
 * 출석 방식(AttendanceAttendanceMethod)을 고유한 method_name으로 정상 등록하는 기능 검증
 *
 * 이 테스트는 새로운 출석 방식을 시스템에 추가할 때 필수 입력 항목(method_name, description)을 통해 출석 방식이 정상적으로 생성되는지 확인합니다.
 * 중복되지 않는 방식명(method_name)을 사용해 등록하고, 반환받은 엔터티의 모든 필드에 입력값 및 자동생성 값이 정확히 담겨 있는지 검증 및 타입 유효성도 확인합니다.
 *
 * 테스트 절차:
 * 1. 중복되지 않는 방식명(method_name)과 적절한 설명(description)으로 생성 요청 실행
 * 2. 반환값(output)의 id는 UUID 형식이고, method_name 및 description이 입력값과 일치하는지 확인
 * 3. 반환 엔터티의 모든 필드가 빠짐없이 반환됐는지 및 타입 검증(typia.assert)
 */
export async function test_api_attendance_test_create_attendance_method_with_unique_method_name(
  connection: api.IConnection,
) {
  // 1. 고유한 method_name 및 적절한 description 생성
  const methodName: string = `FACE_${typia.random<string>()}_${Date.now()}`;
  const description: string = `E2E 자동 테스트용 설명 - ${RandomGenerator.content()()()}`;

  // 2. 출석 방식 생성 API 호출
  const output = await api.functional.attendance.attendanceMethods.post(connection, {
    body: {
      method_name: methodName,
      description: description,
    } satisfies IAttendanceAttendanceMethod.ICreate,
  });
  
  // 3. 반환 데이터 타입 검사 및 비즈니스 필드값 검증
  typia.assert(output);
  TestValidator.equals("method_name 일치")(output.method_name)(methodName);
  TestValidator.equals("description 일치")(output.description)(description);
  TestValidator.predicate("id는 UUID 형식")(output.id.match(/[0-9a-fA-F-]{36}/) !== null);
}