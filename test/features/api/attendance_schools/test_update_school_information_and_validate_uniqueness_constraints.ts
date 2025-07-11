import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";

/**
 * [학교 정보 수정 및 유니크 제약 확인 테스트]
 *
 * 관리자 권한으로 이미 등록된 학교의 이름 또는 주소를 수정하는 과정을 검증한다.
 *
 * 1. 테스트용 학교 A, 학교 B를 각각 사전 생성한다(이름/주소 모두 다르게).
 * 2. 학교 A의 이름만 새로운 값으로 정상 수정 → 응답 값, 갱신 내용확인
 * 3. 학교 A의 주소만 새로운 값으로 정상 수정 → 응답 값, 갱신 내용확인
 * 4. 학교 A의 이름/주소를 동시에 새로운 값으로 수정 → 응답 값, 갱신 내용확인
 * 5. 학교 A의 이름을 학교 B와 똑같이 변경 시도(uniqueness violation) → 409 에러
 * 6. 학교 A의 주소를 학교 B와 똑같이 변경 시도(uniqueness violation) → 409 에러
 * 7. 존재하지 않는(임의의) UUID로 수정 시도 → 404 에러
 * 8. 비정상적 UUID 값으로 요청 → 422 혹은 400 에러
 * 9. 학교 A 데이터 변경 후, 동일 내용으로 한 번 더 put (idempotent) → 정상 동작
 * 10. 학교 A 일부만(이름 그대로, 주소만 변경 등) 수정 → 정상 동작 및 부분반영 확인
 */
export async function test_api_attendance_schools_test_update_school_information_and_validate_uniqueness_constraints(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 A, 학교 B를 각각 사전 생성(이름/주소 다 다르게)
  const schoolAName = `테스트학교A_${RandomGenerator.alphabets(6)}`;
  const schoolAAddress = `서울시 강남구 역삼동 ${RandomGenerator.alphaNumeric(6)}`;
  const schoolBName = `테스트학교B_${RandomGenerator.alphabets(6)}`;
  const schoolBAddress = `부산시 해운대구 우동 ${RandomGenerator.alphaNumeric(6)}`;

  const schoolA = await api.functional.attendance.schools.post(connection, {
    body: {
      name: schoolAName,
      address: schoolAAddress,
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(schoolA);

  const schoolB = await api.functional.attendance.schools.post(connection, {
    body: {
      name: schoolBName,
      address: schoolBAddress,
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(schoolB);

  // 변경 값 준비 (이전, 이후 모두 중복 없이 생성, idempotent 확인 위해 한번 더 저장)
  const newName1 = `수정학교A_${RandomGenerator.alphabets(6)}`;
  const newAddress1 = `서울시 중구 소공동 ${RandomGenerator.alphaNumeric(6)}`;
  const newName2 = `이중수정A_${RandomGenerator.alphabets(6)}`;
  const newAddress2 = `경기도 용인시 기흥구 ${RandomGenerator.alphaNumeric(6)}`;

  // 2. 학교A의 이름만 변경
  const updatedName = await api.functional.attendance.schools.putById(connection, {
    id: schoolA.id,
    body: {
      name: newName1,
      address: schoolA.address,
    } satisfies IAttendanceSchool.IUpdate,
  });
  typia.assert(updatedName);
  TestValidator.equals("이름 변경됨")(updatedName.name)(newName1);
  TestValidator.equals("주소는 그대로")(updatedName.address)(schoolA.address);

  // 3. 학교A의 주소만 변경 (이름은 변경 후 값, 주소는 새 값)
  const updatedAddr = await api.functional.attendance.schools.putById(connection, {
    id: schoolA.id,
    body: {
      name: updatedName.name,
      address: newAddress1,
    } satisfies IAttendanceSchool.IUpdate,
  });
  typia.assert(updatedAddr);
  TestValidator.equals("이름 그대로")(updatedAddr.name)(updatedName.name);
  TestValidator.equals("주소 변경됨")(updatedAddr.address)(newAddress1);

  // 4. 이름, 주소 동시에 수정
  const updatedBoth = await api.functional.attendance.schools.putById(connection, {
    id: schoolA.id,
    body: {
      name: newName2,
      address: newAddress2,
    } satisfies IAttendanceSchool.IUpdate,
  });
  typia.assert(updatedBoth);
  TestValidator.equals("이름 변경됨")(updatedBoth.name)(newName2);
  TestValidator.equals("주소 변경됨")(updatedBoth.address)(newAddress2);

  // 5. 이름 중복(학교B와 이름 같음) → 409 에러
  await TestValidator.error("이미 존재하는 이름 중복")(async () => {
    await api.functional.attendance.schools.putById(connection, {
      id: schoolA.id,
      body: {
        name: schoolB.name,
        address: updatedBoth.address,
      } satisfies IAttendanceSchool.IUpdate,
    });
  });

  // 6. 주소 중복(학교B와 주소 같음) → 409 에러
  await TestValidator.error("이미 존재하는 주소 중복")(async () => {
    await api.functional.attendance.schools.putById(connection, {
      id: schoolA.id,
      body: {
        name: updatedBoth.name,
        address: schoolB.address,
      } satisfies IAttendanceSchool.IUpdate,
    });
  });

  // 7. 존재하지 않는 id(임의 uuid) → 404 에러
  await TestValidator.error("없는 id로 수정시 404")(async () => {
    await api.functional.attendance.schools.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: updatedBoth.name,
        address: updatedBoth.address,
      } satisfies IAttendanceSchool.IUpdate,
    });
  });

  // 8. 잘못된 uuid 포맷(id) → 400 혹은 422 에러
  await TestValidator.error("비정상 uuid 포맷")(async () => {
    await api.functional.attendance.schools.putById(connection, {
      id: "not-a-uuid-format" as string & tags.Format<"uuid">,
      body: {
        name: schoolAName,
        address: schoolAAddress,
      } satisfies IAttendanceSchool.IUpdate,
    });
  });

  // 9. 동일 데이터로 한 번 더 put (idempotent)
  const repeated = await api.functional.attendance.schools.putById(connection, {
    id: schoolA.id,
    body: {
      name: updatedBoth.name,
      address: updatedBoth.address,
    } satisfies IAttendanceSchool.IUpdate,
  });
  typia.assert(repeated);
  TestValidator.equals("동일 데이터 put 시 불변")(repeated.name)(updatedBoth.name);
  TestValidator.equals("동일 데이터 put 시 불변 addr")(repeated.address)(updatedBoth.address);

  // 10. 일부 변경(이름 그대로, 주소만 다시 바꿈)
  const changedAddressAgain = await api.functional.attendance.schools.putById(connection, {
    id: schoolA.id,
    body: {
      name: repeated.name,
      address: newAddress1,
    } satisfies IAttendanceSchool.IUpdate,
  });
  typia.assert(changedAddressAgain);
  TestValidator.equals("이름은 변동 없음")(changedAddressAgain.name)(repeated.name);
  TestValidator.equals("주소만 재변경")(changedAddressAgain.address)(newAddress1);
}