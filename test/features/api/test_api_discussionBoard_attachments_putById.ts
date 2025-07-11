import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

export async function test_api_discussionBoard_attachments_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.attachments.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardAttachment.IUpdate>(),
    });
  typia.assert(output);
}
