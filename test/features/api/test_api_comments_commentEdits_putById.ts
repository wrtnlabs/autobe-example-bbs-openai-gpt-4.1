import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentEdit";

export async function test_api_comments_commentEdits_putById(
  connection: api.IConnection,
) {
  const output: ICommentEdit =
    await api.functional.comments.commentEdits.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommentEdit.IUpdate>(),
    });
  typia.assert(output);
}
