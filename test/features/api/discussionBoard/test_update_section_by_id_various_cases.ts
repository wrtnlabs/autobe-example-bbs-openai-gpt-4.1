import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * E2E Tests for updating a discussion board section by id as administrator, covering:
 * 1. Successful update of name/description/code fields.
 * 2. Attempting to duplicate a code within the same channel (expect error).
 * 3. Updating a non-existent section (expect not-found error).
 * 4. Trying to update as a non-admin (expect authorization failure).
 * 5. Attempting to update with an invalid parent channel id (if allowed by DTO, but skipped here).
 * 6. Checking audit by verifying updated_at field changes and immutable field integrity.
 *
 * Preparation steps:
 * - Create two channels (for section parent usage and code uniqueness testing).
 * - Create two sections: SectionA (in ChannelA) and SectionB (in ChannelB).
 */
export async function test_api_discussionBoard_test_update_section_by_id_various_cases(
  connection: api.IConnection,
) {
  // 1. Create two channels for organizing parent/duplicate scenarios
  const channelA = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code: "chanA" + RandomGenerator.alphaNumeric(5),
      name: "Channel A " + RandomGenerator.alphabets(3),
      description: "Channel for main section testing."
    } satisfies IDiscussionBoardChannel.ICreate
  });
  typia.assert(channelA);
  const channelB = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code: "chanB" + RandomGenerator.alphaNumeric(5),
      name: "Channel B " + RandomGenerator.alphabets(3),
      description: "Channel for secondary section testing."
    } satisfies IDiscussionBoardChannel.ICreate
  });
  typia.assert(channelB);

  // 2. Create two sections, one in each channel
  const sectionA = await api.functional.discussionBoard.sections.post(connection, {
    body: {
      discussion_board_channel_id: channelA.id,
      code: "sectA" + RandomGenerator.alphaNumeric(5),
      name: "Section A " + RandomGenerator.alphabets(3),
      description: "First section in Channel A"
    } satisfies IDiscussionBoardSection.ICreate
  });
  typia.assert(sectionA);
  const sectionB = await api.functional.discussionBoard.sections.post(connection, {
    body: {
      discussion_board_channel_id: channelB.id,
      code: "sectB" + RandomGenerator.alphaNumeric(5),
      name: "Section B " + RandomGenerator.alphabets(3),
      description: "First section in Channel B"
    } satisfies IDiscussionBoardSection.ICreate
  });
  typia.assert(sectionB);

  // --- 1. SUCCESS: Update name, description, code ---
  const updatedName = "Updated Name " + RandomGenerator.alphabets(4);
  const updatedCode = sectionA.code + "_upd";
  const updatedDesc = "Updated description " + RandomGenerator.alphaNumeric(5);
  const updateResult = await api.functional.discussionBoard.sections.putById(connection, {
    id: sectionA.id,
    body: {
      code: updatedCode,
      name: updatedName,
      description: updatedDesc
    } satisfies IDiscussionBoardSection.IUpdate
  });
  typia.assert(updateResult);
  TestValidator.equals("name updated")(updateResult.name)(updatedName);
  TestValidator.equals("code updated")(updateResult.code)(updatedCode);
  TestValidator.equals("description updated")(updateResult.description)(updatedDesc);
  TestValidator.predicate("updated_at changed")(updateResult.updated_at !== sectionA.updated_at);

  // --- 2. FAILURE: Code Duplicated in Channel ---
  await TestValidator.error("Duplicate code in channel should fail")(() =>
    api.functional.discussionBoard.sections.putById(connection, {
      id: sectionA.id,
      body: {
        code: sectionB.code, // sectionB.code is unique in channelB, should fail in channelA
        name: updatedName,
        description: updatedDesc
      } satisfies IDiscussionBoardSection.IUpdate
    })
  );

  // --- 3. FAILURE: Non-existent Section ---
  await TestValidator.error("Update non-existent section should fail")(() =>
    api.functional.discussionBoard.sections.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        code: updatedCode,
        name: updatedName,
        description: updatedDesc
      } satisfies IDiscussionBoardSection.IUpdate
    })
  );

  // --- 4. FAILURE: Unauthorized (Non-admin) ---
  // Simulate unauthorized by removing auth or using a simulated/generic connection
  const nonAdminConnection = { ...connection, headers: {} };
  await TestValidator.error("Non-admin should not update section")(() =>
    api.functional.discussionBoard.sections.putById(nonAdminConnection, {
      id: sectionA.id,
      body: {
        code: updatedCode + "x",
        name: updatedName + "x",
        description: updatedDesc + "x"
      } satisfies IDiscussionBoardSection.IUpdate
    })
  );

  // --- 5. FAILURE: Invalid parent channel/reference ---
  // Not directly possible as section parent can't change (not in IUpdate), skipped.

  // --- 6. AUDIT: Verify old/new data and audit fields ---
  TestValidator.equals("id unchanged")(updateResult.id)(sectionA.id);
  TestValidator.equals("discussion_board_channel_id unchanged")(updateResult.discussion_board_channel_id)(sectionA.discussion_board_channel_id);
  TestValidator.predicate("updated_at is ISO string")(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[\d.]+Z/.test(updateResult.updated_at));
  TestValidator.equals("created_at unchanged")(updateResult.created_at)(sectionA.created_at);
  TestValidator.equals("deleted_at unchanged")(updateResult.deleted_at)(sectionA.deleted_at);
}