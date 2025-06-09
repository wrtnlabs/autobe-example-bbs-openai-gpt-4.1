import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentEdit";

export async function test_api_comments_commentEdits_post(
  connection: api.IConnection,
) {
  const output: ICommentEdit = await api.functional.comments.commentEdits.post(
    connection,
    {
      body: typia.random<ICommentEdit.ICreate>(),
    },
  );
  typia.assert(output);
}
