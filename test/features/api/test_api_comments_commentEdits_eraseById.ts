import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentEdit";

export async function test_api_comments_commentEdits_eraseById(
  connection: api.IConnection,
) {
  const output: ICommentEdit =
    await api.functional.comments.commentEdits.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
