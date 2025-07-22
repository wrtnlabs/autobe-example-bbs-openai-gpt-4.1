import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * E2E test for retrieval of a discussion board section detail by UUID.
 *
 * This test covers:
 * 1. Successful retrieval of a newly created discussion board section by its valid UUID, ensuring all expected metadata (including linkage to the parent channel) is returned.
 * 2. Attempting to access a soft-deleted section, ensuring such access is denied after deletion.
 * 3. Fetching with a non-existent UUID to verify not-found error handling.
 * 4. (Omitted: Unauthorized access. Cannot be implemented without user/role APIs.)
 *
 * **Steps:**
 * 1. Create a discussion board channel (to serve as parent)
 * 2. Create a new section under that channel
 * 3. Retrieve the section using its UUID and validate all atomic fields
 * 4. Soft-delete the section; confirm that subsequent retrieval fails
 * 5. Attempt to retrieve a section with a random (non-existent) UUID; confirm not-found error
 * 6. (Skipped: privacy / unauthorized user check, as not supported by current API)
 */
export async function test_api_discussionBoard_test_get_section_detail_by_uuid_valid_and_invalid(
  connection: api.IConnection,
) {
  // 1. Create a discussion board channel
  const channel = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code: RandomGenerator.alphaNumeric(5),
      name: RandomGenerator.paragraph()(1),
      description: RandomGenerator.paragraph()(1),
    } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel);

  // 2. Create a section in the new channel
  const section = await api.functional.discussionBoard.sections.post(connection, {
    body: {
      discussion_board_channel_id: channel.id,
      code: RandomGenerator.alphaNumeric(5),
      name: RandomGenerator.paragraph()(1),
      description: RandomGenerator.paragraph()(1),
    } satisfies IDiscussionBoardSection.ICreate,
  });
  typia.assert(section);

  // 3. Retrieve by ID, validate atomic fields
  const got = await api.functional.discussionBoard.sections.getById(connection, {
    id: section.id,
  });
  typia.assert(got);
  TestValidator.equals("retrieved section matches created")(got.id)(section.id);
  TestValidator.equals("parent channel matches")(got.discussion_board_channel_id)(channel.id);
  TestValidator.equals("name matches")(got.name)(section.name);
  TestValidator.equals("code matches")(got.code)(section.code);
  TestValidator.equals("description matches")(got.description ?? null)(section.description ?? null);

  // 4. Soft-delete the section and check that retrieval is denied
  await api.functional.discussionBoard.sections.eraseById(connection, {
    id: section.id,
  });
  await TestValidator.error("cannot fetch soft-deleted section")(
    async () => {
      await api.functional.discussionBoard.sections.getById(connection, { id: section.id });
    },
  );

  // 5. Fetch with a non-existent UUID, expect not found error
  await TestValidator.error("not found error on non-existent UUID")(
    async () => {
      await api.functional.discussionBoard.sections.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Omitted: Unauthorized access not implemented (would require API for auth context/role switching)
}