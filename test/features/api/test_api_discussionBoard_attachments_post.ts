import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

export async function test_api_discussionBoard_attachments_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.attachments.post(connection, {
      body: typia.random<IDiscussionBoardAttachment.ICreate>(),
    });
  typia.assert(output);
}
