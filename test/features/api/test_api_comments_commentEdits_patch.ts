import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommentEdit";
import { ICommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentEdit";

export async function test_api_comments_commentEdits_patch(
  connection: api.IConnection,
) {
  const output: IPageICommentEdit =
    await api.functional.comments.commentEdits.patch(connection, {
      body: typia.random<ICommentEdit.IRequest>(),
    });
  typia.assert(output);
}
