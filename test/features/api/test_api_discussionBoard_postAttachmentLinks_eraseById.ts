import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardPostAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachmentLink";

export async function test_api_discussionBoard_postAttachmentLinks_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardPostAttachmentLink.IDeleteResult =
    await api.functional.discussionBoard.postAttachmentLinks.eraseById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
