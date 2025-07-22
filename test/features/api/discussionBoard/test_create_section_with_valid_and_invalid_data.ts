import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Validate creation of discussion board sections with both valid and invalid payloads.
 *
 * 1. Create a parent channel (as admin) to use for valid section creation.
 * 2. [Success] Create a new section with unique code, name, and valid parent_channel; validate audit fields and linkage.
 * 3. [Uniqueness Violation] Attempt to create a section in the same channel using a duplicate code; verify uniqueness constraint error is raised.
 * 4. [Non-existent Channel] Try to create a section with a randomly generated, non-existent channel id; verify error.
 * 5. [Missing Fields] Attempt to create a section omitting required fields (code or name) and expect validation errors (SKIP if would require TS compilation errors).
 * 6. [Unauthorized Access] Simulate non-admin by clearing authorization or using empty headers and ensure permission denied.
 * 7. Audit checks: Validate created_at, discussion_board_channel_id presence in successful response.
 */
export async function test_api_discussionBoard_test_create_section_with_valid_and_invalid_data(connection: api.IConnection) {
  // Step 1: Create parent channel
  const channel = await api.functional.discussionBoard.channels.post(connection, {
    body: {
      code: RandomGenerator.alphaNumeric(6),
      name: RandomGenerator.paragraph()(3),
      description: RandomGenerator.paragraph()(5),
    } satisfies IDiscussionBoardChannel.ICreate,
  });
  typia.assert(channel);

  // Step 2: [Success] Create section with unique code, valid name, and valid channel
  const sectionUniqueCode = RandomGenerator.alphaNumeric(6);
  const section = await api.functional.discussionBoard.sections.post(connection, {
    body: {
      discussion_board_channel_id: channel.id,
      code: sectionUniqueCode,
      name: RandomGenerator.paragraph()(3),
      description: RandomGenerator.paragraph()(5),
    } satisfies IDiscussionBoardSection.ICreate,
  });
  typia.assert(section);
  TestValidator.equals('parent channel linkage')(section.discussion_board_channel_id)(channel.id);
  TestValidator.predicate('audit field created_at')(
    typeof section.created_at === 'string' && !!Date.parse(section.created_at),
  );

  // Step 3: [Duplicate Code] Attempt to create section in same channel with duplicate code
  await TestValidator.error('duplicate code in same channel')(() =>
    api.functional.discussionBoard.sections.post(connection, {
      body: {
        discussion_board_channel_id: channel.id,
        code: sectionUniqueCode,
        name: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(5),
      } satisfies IDiscussionBoardSection.ICreate,
    })
  );

  // Step 4: [Non-existent Channel] Attempt to create section under non-existent channel
  await TestValidator.error('non-existent parent channel')(() =>
    api.functional.discussionBoard.sections.post(connection, {
      body: {
        discussion_board_channel_id: typia.random<string & tags.Format<'uuid'>>(),
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(5),
      } satisfies IDiscussionBoardSection.ICreate,
    })
  );

  // Step 5: [Missing required fields] OMITTED because would cause TS compilation error (required by ICreate type)

  // Step 6: [Unauthorized Access] Simulate non-admin/unauthorized by clearing auth header (simulate blank connection)
  const nonAuthConnection = { ...connection, headers: {} };
  await TestValidator.error('permission denied (non-admin)')(() =>
    api.functional.discussionBoard.sections.post(nonAuthConnection, {
      body: {
        discussion_board_channel_id: channel.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(5),
      } satisfies IDiscussionBoardSection.ICreate
    })
  );
}