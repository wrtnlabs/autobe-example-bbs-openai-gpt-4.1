import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test that updating a non-existent configuration returns a not found error.
 *
 * This E2E test validates the behavior of the admin-only configuration update endpoint
 * when an attempt is made to update a configuration record that does not exist.
 * Specifically, it ensures that the endpoint returns a 404 Not Found error in such cases,
 * as required by robust API design and proper administrator feedback flows.
 *
 * Business context:
 * - Only administrators can update configuration records.
 * - The request uses a valid admin authentication session.
 * - Attempting to update a configuration row using a random UUID that does not match any
 *   existing configuration record must yield a not found response, preventing silent failures.
 *
 * Test Steps:
 * 1. Register a new discussion board member (to have a user account).
 * 2. Promote the member to administrator rights so that configuration APIs are accessible.
 * 3. As this administrator, attempt to update a configuration using a random non-existent UUID for the id parameter.
 * 4. Expect the response to be a 404 Not Found error (caught as a thrown error in SDK).
 */
export async function test_api_discussionBoard_test_update_configuration_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member for admin role setup
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member);

  // 2. Promote this member to administrator so they can access configuration APIs
  const admin = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: member.id },
  });
  typia.assert(admin);

  // 3. Prepare a random UUID (not mapped to any configuration row)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  // Construct a valid configuration update payload
  const updateBody: IDiscussionBoardConfiguration.IUpdate = {
    key: RandomGenerator.alphaNumeric(8),
    value: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.paragraph()(),
  };

  // 4. Attempt update; expect a 404 error response
  await TestValidator.error("updating non-existent configuration triggers 404 error")(
    async () => {
      await api.functional.discussionBoard.configurations.putById(connection, {
        id: randomId,
        body: updateBody,
      });
    },
  );
}