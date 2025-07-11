import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";

/**
 * 출석 방식 상세조회 API의 정상 동작 시나리오 검증.
 *
 * 관리자가 새로운 출석 방식을 등록한 후(POST /attendance/attendanceMethods),
 * 그 id로 상세조회(GET /attendance/attendanceMethods/{id})를 실행해
 * 모든 반환 필드(method_name, description, id)가 정확히 반환되고, 생성입력값과 일치하는지 검증합니다.
 *
 * 1. 관리자가 출석 방식(method_name, description)을 임의로 생성한다.
 * 2. 생성된 출석 방식의 id를 획득한다.
 * 3. 상세조회 API로 해당 id를 요청한다.
 * 4. 응답의 모든 필드가 존재하며, 생성 시 입력값과 정확히 일치하는지 검증한다.
 */
export async function test_api_attendance_test_get_attendance_method_detail_success(
  connection: api.IConnection,
) {
  // 1. 출석 방식 생성
  const createInput = {
    method_name: "CUSTOM_METHOD_" + RandomGenerator.alphabets(6),
    description: RandomGenerator.paragraph()(1),
  } satisfies IAttendanceAttendanceMethod.ICreate;
  const created = await api.functional.attendance.attendanceMethods.post(connection, {
    body: createInput,
  });
  typia.assert(created);

  // 2. 상세조회
  const detail = await api.functional.attendance.attendanceMethods.getById(connection, {
    id: created.id,
  });
  typia.assert(detail);

  // 3. 값 검증
  TestValidator.equals("생성 id와 조회 id 일치")(detail.id)(created.id);
  TestValidator.equals("method_name 일치")(detail.method_name)(createInput.method_name);
  TestValidator.equals("description 일치")(detail.description)(createInput.description);
}