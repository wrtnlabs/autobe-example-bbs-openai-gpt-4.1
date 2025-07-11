import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardPostAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachmentLink";

export async function test_api_discussionBoard_postAttachmentLinks_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPostAttachmentLink =
    await api.functional.discussionBoard.postAttachmentLinks.post(connection, {
      body: typia.random<IDiscussionBoardPostAttachmentLink.ICreate>(),
    });
  typia.assert(output);
}
