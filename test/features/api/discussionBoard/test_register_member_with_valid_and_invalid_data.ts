import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test registering a new member (discussion board).
 *
 * This E2E test covers all major registration flows and edge cases for
 * creating a discussion board member, including both successful and failure
 * scenarios. It ensures that all business rules and validation constraints
 * are enforced properly and that optional fields are handled as expected.
 *
 * Business process:
 * 1. Register a member with fully valid, unique, and complete data (with/without optional profile image)
 * 2. Attempt to register with duplicate email or username (should fail)
 * 3. Attempt to register with invalid email and insufficient hashed_password (should fail)
 * 4. Attempt to register with missing required fields (should fail)
 * 5. Edge case: registration with explicit null and omitted profile_image_url (both must succeed)
 */
export async function test_api_discussionBoard_test_register_member_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // 1. Register with valid, all-required data and optional profile_image_url
  const regData: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(32), // simulate real hash
    display_name: RandomGenerator.name(),
    profile_image_url: RandomGenerator.pick([
      typia.random<string & tags.Format<"uri">>(),
      undefined,
      null,
    ]),
  };
  const member = await api.functional.discussionBoard.members.post(connection, { body: regData });
  typia.assert(member);
  TestValidator.equals("username")(member.username)(regData.username);
  TestValidator.equals("email")(member.email)(regData.email);
  TestValidator.equals("display_name")(member.display_name)(regData.display_name);
  if (regData.profile_image_url != null)
    TestValidator.equals("profile_image_url")(member.profile_image_url)(regData.profile_image_url);
  TestValidator.predicate("id is uuid")(typeof member.id === "string" && member.id.length > 10);
  TestValidator.predicate("created_at is ISO8601 date")(!!Date.parse(member.created_at));
  TestValidator.predicate("updated_at is ISO8601 date")(!!Date.parse(member.updated_at));
  TestValidator.equals("not deleted")(member.deleted_at)(null);

  // 2. Attempt registration with duplicate email
  await TestValidator.error("duplicate email/username should fail")(async () => {
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        ...regData,
        username: RandomGenerator.alphaNumeric(11) // different username, duplicate email
      },
    });
  });
  // Attempt registration with duplicate username
  await TestValidator.error("duplicate username should fail")(async () => {
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        ...regData,
        email: typia.random<string & tags.Format<"email">>() // different email, duplicate username
      },
    });
  });

  // 3. Registration with invalid email
  await TestValidator.error("invalid email should fail")(async () => {
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        ...regData,
        email: "not-an-email" as any,
      },
    });
  });
  // Registration with invalid hashed_password (empty string)
  await TestValidator.error("invalid hashed_password should fail")(async () => {
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        ...regData,
        hashed_password: "",
      },
    });
  });

  // 4. Registration with missing required fields
  await TestValidator.error("missing required username should fail")(async () => {
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        // username omitted
        email: regData.email,
        hashed_password: regData.hashed_password,
        display_name: regData.display_name,
      } as any,
    });
  });
  await TestValidator.error("missing required email should fail")(async () => {
    await api.functional.discussionBoard.members.post(connection, {
      body: {
        // email omitted
        username: regData.username,
        hashed_password: regData.hashed_password,
        display_name: regData.display_name,
      } as any,
    });
  });

  // 5. profile_image_url omitted and explicit null
  const regNoImg = { ...regData, username: RandomGenerator.alphaNumeric(12), email: typia.random<string & tags.Format<"email">>() };
  const member2 = await api.functional.discussionBoard.members.post(connection, { body: { ...regNoImg, profile_image_url: undefined } });
  typia.assert(member2);
  const member3 = await api.functional.discussionBoard.members.post(connection, { body: { ...regNoImg, profile_image_url: null } });
  typia.assert(member3);
}