import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { administratorAuthorize } from "../providers/authorize/administratorAuthorize";

/**
 * Decorator that authenticates and injects the AdministratorPayload using JWT.
 * Adds Bearer auth documentation in Swagger.
 * Usage: @AdministratorAuth() administrator: AdministratorPayload
 */
export const AdministratorAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({
        bearer: [],
      });
    })(target, propertyKey as string, undefined!);
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return administratorAuthorize(request);
  })(),
);
