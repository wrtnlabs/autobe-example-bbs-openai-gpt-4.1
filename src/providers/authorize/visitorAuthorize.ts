import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { VisitorPayload } from "../../decorators/payload/VisitorPayload";

/**
 * Authenticate Visitor payload from JWT and validate session.
 *
 * @param request HTTP request object containing headers
 * @returns VisitorPayload if valid and enrolled, otherwise throws
 */
export async function visitorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<VisitorPayload> {
  const payload: VisitorPayload = jwtAuthorize({ request }) as VisitorPayload;

  if (payload.type !== "visitor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains the top-level visitor table ID
  const visitor = await MyGlobal.prisma.discussion_board_visitors.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (visitor === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
