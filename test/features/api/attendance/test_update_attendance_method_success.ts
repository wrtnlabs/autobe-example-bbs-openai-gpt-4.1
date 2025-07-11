import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAttendanceMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAttendanceMethod";

/**
 * 출석 방식 마스터 전체수정(putById) 성공 케이스 검증
 *
 * - 출석 방식 마스터 엔터티를 신규 생성(POST /attendance/attendanceMethods) 후, 해당 id를 이용해
 *   PUT /attendance/attendanceMethods/{id}로 method_name, description 등 수정 가능한 모든 필드를
 *   바꿔서 수정 요청
 * - 정상적으로 반영되면, 반환값에 변경된 값이 정확히 담겨 있는지 검증
 * - 즉, 생성→수정→검증의 비즈니스 플로우를 따라 미리 준비된 값을 모두 변경하고, 실제 응답을 가진 모든 필드를 input값 기준으로 체크
 *
 * ## 절차
 * 1. 출석 방식 마스터를 임의 값으로 생성(POST)
 * 2. 해당 id로 method_name, description 모두 다른 값으로 변경(PUT)
 * 3. 반환값이 입력값대로 바뀌었는지 모든 필드에 대해 검증
 */
export async function test_api_attendance_test_update_attendance_method_success(
  connection: api.IConnection,
) {
  // 1. 출석 방식 마스터를 임의 값으로 생성(POST)
  const createInput: IAttendanceAttendanceMethod.ICreate = {
    method_name: `METHOD_${RandomGenerator.alphabets(6)}`,
    description: `초기 설명: ${RandomGenerator.paragraph()(2)}`,
  };
  const created: IAttendanceAttendanceMethod = await api.functional.attendance.attendanceMethods.post(
    connection,
    { body: createInput }
  );
  typia.assert(created);
  TestValidator.equals("생성 method_name 일치")(created.method_name)(createInput.method_name);
  TestValidator.equals("생성 description 일치")(created.description)(createInput.description);

  // 2. 등록한 id로 method_name, description 모두 다른 값으로 변경(PUT)
  const updateInput: IAttendanceAttendanceMethod.IUpdate = {
    method_name: `UPDATED_${RandomGenerator.alphabets(8)}`,
    description: `수정 설명: ${RandomGenerator.paragraph()(3)}`,
  };
  const updated: IAttendanceAttendanceMethod = await api.functional.attendance.attendanceMethods.putById(
    connection,
    {
      id: created.id,
      body: updateInput,
    }
  );
  typia.assert(updated);

  // 3. 반환 객체의 모든 필드가 변경 input 기준으로 정확히 반영됐는지 검증
  TestValidator.equals("수정 method_name 반영")(updated.method_name)(updateInput.method_name);
  TestValidator.equals("수정 description 반영")(updated.description)(updateInput.description);
  TestValidator.equals("PK id 불변")(updated.id)(created.id);
}