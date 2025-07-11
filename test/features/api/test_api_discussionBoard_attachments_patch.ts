import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

export async function test_api_discussionBoard_attachments_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardAttachment =
    await api.functional.discussionBoard.attachments.patch(connection, {
      body: typia.random<IDiscussionBoardAttachment.IRequest>(),
    });
  typia.assert(output);
}
