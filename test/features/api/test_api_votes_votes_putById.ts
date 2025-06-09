import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IVote";

export async function test_api_votes_votes_putById(
  connection: api.IConnection,
) {
  const output: IVote = await api.functional.votes.votes.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IVote.IUpdate>(),
  });
  typia.assert(output);
}
