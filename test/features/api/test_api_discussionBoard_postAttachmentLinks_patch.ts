import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardPostAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostAttachmentLink";
import { IDiscussionBoardPostAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachmentLink";

export async function test_api_discussionBoard_postAttachmentLinks_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardPostAttachmentLink =
    await api.functional.discussionBoard.postAttachmentLinks.patch(connection, {
      body: typia.random<IDiscussionBoardPostAttachmentLink.IRequest>(),
    });
  typia.assert(output);
}
