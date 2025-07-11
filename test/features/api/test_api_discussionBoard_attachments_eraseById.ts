import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

export async function test_api_discussionBoard_attachments_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.attachments.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
