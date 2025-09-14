import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Authenticate and authorize guest (unauthenticated/temporary visitor) users using JWT.
 *
 * - Verifies JWT using system secret and ensures payload type is 'guest'.
 * - Ensures the guest exists and is not anonymized/deleted by querying `discuss_board_guests`.
 * - Returns the top-level guest ID from the payload.
 *
 * @param request Incoming HTTP request with headers (must include Authorization Bearer token)
 * @throws ForbiddenException if type mismatch or guest is deregistered/anonymized
 * @returns GuestPayload containing top-level guest id and role type
 */
export async function guestAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is top-level guest table ID
  const guest = await MyGlobal.prisma.discuss_board_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not a valid guest session");
  }

  return payload;
}
