import { Injectable, Logger } from "@nestjs/common";
import { AuthorizationService } from "../../authorization/authorization.service";

@Injectable()
export class AuthorizeHandler {

  private readonly logger =
    new Logger(AuthorizeHandler.name);


  constructor(
    private readonly authorizationService:
      AuthorizationService,
  ) {}


  async handle(
    chargePointId: string,
    payload: any,
  ) {

    const {
      idTag,
    } = payload;


    this.logger.log(
      `Authorize request from ${chargePointId} for tag ${idTag}`,
    );


    if (!idTag) {
      return {
        idTagInfo: {
          status: "Invalid",
        },
      };
    }


    try {

      const result =
        await this.authorizationService.authorize(
          idTag,
        );


      return {
        idTagInfo: {
          status: result.authorized
            ? "Accepted"
            : "Blocked",

          expiryDate: null,

          parentIdTag: null,
        },
      };


    } catch(error) {

      this.logger.warn(
        `RFID authorization failed: ${idTag}`,
      );


      return {
        idTagInfo: {
          status: "Invalid",
        },
      };

    }
  }
}
