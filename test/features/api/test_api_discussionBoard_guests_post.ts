import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_discussionBoard_guests_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardGuest =
    await api.functional.discussionBoard.guests.post(connection, {
      body: typia.random<IDiscussionBoardGuest.ICreate>(),
    });
  typia.assert(output);
}
