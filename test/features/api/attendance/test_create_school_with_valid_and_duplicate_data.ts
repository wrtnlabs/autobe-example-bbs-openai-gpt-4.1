import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";

/**
 * 학교 신규 등록 API에 대한 통합 테스트: 정상 생성 및 에러(중복, 필수 입력 누락, 포맷 오류) 케이스 검증
 *
 * 본 테스트는 관리자가 신규 학교 등록을 시도할 때 다음 사항을 종합적으로 검증한다.
 * 1. 정상 입력(적절한 이름/주소) 등록 시 id(UUID)/name/address/created_at 필드가 정확히 리턴되는지
 * 2. 동일한 이름, 주소로 중복 등록 시 409 에러가 발생하는지
 * 3. 이름 혹은 주소 누락 시 422 에러가 발생하는지
 * 4. 너무 짧거나 긴(유효성 실패) 이름/주소 입력 시 422 오류가 반환되는지
 *
 * 각 케이스에서 business rule 및 API 스키마 대로 정상 동작, 적절한 상태코드/메시지 검증이 포함된다.
 */
export async function test_api_attendance_test_create_school_with_valid_and_duplicate_data(
  connection: api.IConnection,
) {
  // 1. 정상 신규 학교 등록
  const validSchoolInput: IAttendanceSchool.ICreate = {
    name: `테스트학교_${RandomGenerator.alphabets(8)}`,
    address: `서울시 강남구 역삼동 ${RandomGenerator.alphaNumeric(10)}`,
  };
  const created = await api.functional.attendance.schools.post(connection, { body: validSchoolInput });
  typia.assert(created);
  // 필드 값 검증
  TestValidator.predicate("생성된 id가 uuid 포맷인지")(created.id.length === 36 && created.id.includes("-"));
  TestValidator.equals("이름 일치")(created.name)(validSchoolInput.name);
  TestValidator.equals("주소 일치")(created.address)(validSchoolInput.address);
  TestValidator.predicate("created_at이 ISO8601 포맷인지")(!!Date.parse(created.created_at));

  // 2. 동일 이름, 주소 재등록 시 - 중복 409
  await TestValidator.error("중복 등록시 409 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: validSchoolInput });
    }
  );

  // 3. 필수 입력(이름 누락)
  await TestValidator.error("이름 누락시 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { address: validSchoolInput.address } as any });
    }
  );
  // 3-2. 필수 입력(주소 누락)
  await TestValidator.error("주소 누락시 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { name: validSchoolInput.name } as any });
    }
  );

  // 4. 포맷 오류 (너무 짧은 이름/주소)
  await TestValidator.error("너무 짧은 학교명 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { name: "가", address: validSchoolInput.address } as any });
    }
  );
  await TestValidator.error("너무 짧은 학교주소 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { name: validSchoolInput.name, address: "서울" } as any });
    }
  );
  // 4-2. 너무 긴 이름/주소
  await TestValidator.error("너무 긴 학교명 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { name: RandomGenerator.alphabets(200), address: validSchoolInput.address } as any });
    }
  );
  await TestValidator.error("너무 긴 주소 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { name: validSchoolInput.name, address: RandomGenerator.alphabets(250) } as any });
    }
  );
  // 4-3. 공백만 입력 시
  await TestValidator.error("학교명 공백입력 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { name: "   ", address: validSchoolInput.address } as any });
    }
  );
  await TestValidator.error("주소 공백입력 422 오류")(
    async () => {
      await api.functional.attendance.schools.post(connection, { body: { name: validSchoolInput.name, address: "   " } as any });
    }
  );
}