import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test the soft deletion (eraseById) of a discussion board section: success, conflict, not-found, and audit conditions.
 *
 * This function validates:
 * 1. A section can be soft deleted (deleted_at timestamp set; other fields preserved).
 * 2. Repeated deletion triggers an error (conflict/not-modified as per business rules).
 * 3. Deleting a non-existent section triggers a not-found error.
 * 4. Audit requirements: deleted_at is null before deletion and populated after.
 *
 * Note: Simulation of unauthorized user deletion cannot be tested due to lack of API for role context switching.
 *
 * Steps:
 * - Create channel (admin context assumed).
 * - Create section within channel.
 * - Confirm section is active (deleted_at is null).
 * - Soft delete section, validate deleted_at is set and other fields are unchanged.
 * - Attempt repeated deletion and expect error.
 * - Attempt to delete a non-existent section and expect error.
 */
export async function test_api_discussionBoard_test_soft_delete_section_and_error_conditions(
  connection: api.IConnection,
) {
  // 1. Create channel as admin
  const channel = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.paragraph()(1),
      description: RandomGenerator.paragraph()(1),
    } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel);

  // 2. Create section under the channel
  const section = await api.functional.discussionBoard.sections.post(connection, {
    body: {
      discussion_board_channel_id: channel.id,
      code: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.paragraph()(1),
      description: RandomGenerator.paragraph()(1),
    } satisfies IDiscussionBoardSection.ICreate,
  });
  typia.assert(section);
  TestValidator.equals("deleted_at is null before deletion")(section.deleted_at)(null);

  // 3. Soft delete section and check audit (deleted_at now set)
  const deletedSection = await api.functional.discussionBoard.sections.eraseById(connection, {
    id: section.id,
  });
  typia.assert(deletedSection);
  TestValidator.equals("section id unchanged after deletion")(deletedSection.id)(section.id);
  TestValidator.notEquals("deleted_at exists after deletion")(deletedSection.deleted_at)(null);
  TestValidator.equals("other fields preserved after deletion")({
    code: deletedSection.code,
    name: deletedSection.name,
    discussion_board_channel_id: deletedSection.discussion_board_channel_id,
  })({
    code: section.code,
    name: section.name,
    discussion_board_channel_id: section.discussion_board_channel_id,
  });

  // 4. Try to delete again (should error: already deleted/conflict)
  await TestValidator.error("repeated deletion should fail")(
    async () => {
      await api.functional.discussionBoard.sections.eraseById(connection, { id: section.id });
    },
  );

  // 5. Try to delete a non-existent section (should error: not found)
  await TestValidator.error("delete non-existent section should fail")(
    async () => {
      await api.functional.discussionBoard.sections.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}