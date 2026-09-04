import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AuthorizeHandler {
  private readonly logger = new Logger(AuthorizeHandler.name);

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

    return {
      idTagInfo: {
        status: "Accepted",
        expiryDate: null,
        parentIdTag: null,
      },
    };
  }
}
