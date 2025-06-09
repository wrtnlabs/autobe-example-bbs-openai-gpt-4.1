import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IVote";

export async function test_api_votes_votes_eraseById(
  connection: api.IConnection,
) {
  const output: IVote.IDeleteResult =
    await api.functional.votes.votes.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
