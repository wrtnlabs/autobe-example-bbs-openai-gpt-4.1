import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardPostAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachmentLink";

export async function test_api_discussionBoard_postAttachmentLinks_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPostAttachmentLink =
    await api.functional.discussionBoard.postAttachmentLinks.putById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardPostAttachmentLink.IUpdate>(),
      },
    );
  typia.assert(output);
}
