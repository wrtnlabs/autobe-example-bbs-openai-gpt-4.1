import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IVote";

export async function test_api_votes_votes_post(connection: api.IConnection) {
  const output: IVote = await api.functional.votes.votes.post(connection, {
    body: typia.random<IVote.ICreate>(),
  });
  typia.assert(output);
}
