import { Injectable, Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from "@nestjs/websockets";

import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";

import { OcppConnectionService } from "../services/ocpp-connection.service";
import { OcppMessageRouter } from "../services/ocpp-message.router";
import { OcppConnectionRegistry } from "../services/ocpp-connection.registry";
import { PrismaService } from "../../database/prisma.service";

import {
  parseOcppFrame,
} from "../core/ocpp-frame.parser";

import {
  validateOcppFrame,
} from "../core/ocpp-frame.validator";

import {
  OCPP_MESSAGE_TYPE,
} from "../core/ocpp.constants";



function extractChargePointId(
  request: IncomingMessage,
): string | null {

  const url = new URL(
    request.url ?? "",
    "ws://localhost",
  );

  const parts = url.pathname
    .split("/")
    .filter(Boolean);


  if (parts.length < 2) {
    return null;
  }


  return parts[1];
}



function validateProtocol(
  request: IncomingMessage,
): boolean {

  const protocol =
    request.headers["sec-websocket-protocol"];


  if (!protocol) {
    return false;
  }


  return protocol
    .toString()
    .split(",")
    .map((p) => p.trim())
    .includes("ocpp1.6");
}



@Injectable()
export class OcppGateway
implements OnGatewayConnection, OnGatewayDisconnect {

  private readonly logger =
    new Logger(OcppGateway.name);



  private readonly chargePointBySocket =
    new WeakMap<WebSocket, string>();



  constructor(
    private readonly connectionService:
      OcppConnectionService,

    private readonly messageRouter:
      OcppMessageRouter,

    private readonly registry:
      OcppConnectionRegistry,

    private readonly prisma: PrismaService,
  ) {
    this.logger.log("OCPP Gateway booted");
    this.logger.log(
      `Prisma check chargePoint=${typeof this.prisma?.chargePoint}`,
    );
  }



  async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {

    this.logger.log(
      `Incoming websocket request ${request.url} protocol=${request.headers["sec-websocket-protocol"]}`,
    );



    if (!validateProtocol(request)) {

      this.logger.warn(
        "Rejected connection without OCPP 1.6 protocol",
      );

      client.close();

      return;
    }



    const chargePointId =
      extractChargePointId(request);

    if (!chargePointId) {
      this.logger.warn(
        `Rejected connection without charge point id. URL=${request.url}`,
      );
      client.close();
      return;
    }

    try {
      const chargePoint = await this.prisma.chargePoint.findUnique({
        where: { serialNumber: chargePointId },
      });

      if (!chargePoint) {
        this.logger.warn(
          `Rejected connection: unknown charge point ${chargePointId}`,
        );
        client.close();
        return;
      }

      const internalId = chargePoint.id;

      this.chargePointBySocket.set(client, internalId);
      this.registry.register(internalId, client);

      client.on("error", (error) => {
        this.logger.error(`WebSocket error ${error.message}`);
      });



      await this.connectionService.register(
        internalId,
        client,
        request.socket.remoteAddress,
      );

      client.on("message", (raw: Buffer) => {
        void this.handleMessage(client, internalId, raw);
      });

      this.logger.log(
        `OCPP charger connected: ${chargePointId} (${internalId})`,
      );
    } catch (error) {
      this.logger.error(
        `handleConnection failed for ${chargePointId}: ${(error as Error).message}`,
      );
      client.close();
    }
  }




  async handleDisconnect(
    client: WebSocket,
  ): Promise<void> {


    const chargePointId =
      this.chargePointBySocket.get(client);



    if (!chargePointId) {
      return;
    }



    this.registry.remove(
      chargePointId,
    );



    await this.connectionService.remove(
      chargePointId,
    );



    this.logger.log(
      `OCPP charger disconnected: ${chargePointId}`,
    );
  }





  private async handleMessage(
    client: WebSocket,
    chargePointId: string,
    raw: Buffer,
  ): Promise<void> {


    await this.connectionService.touch(
      chargePointId,
    );



    let frame;


    try {

      const decoded =
        JSON.parse(
          raw.toString("utf8"),
        );


      frame = parseOcppFrame(
        decoded,
      );


      validateOcppFrame(
        frame,
      );


    } catch {

      this.logger.warn(
        `Invalid OCPP frame from ${chargePointId}`,
      );

      return;

    }



    if (frame.type !== "CALL") {
      return;
    }



    const {
      uniqueId,
      action,
      payload,
    } = frame;



    try {


      const result =
        await this.messageRouter.route(
          chargePointId,
          action,
          payload,
        );



      client.send(
        JSON.stringify([
          OCPP_MESSAGE_TYPE.CALL_RESULT,
          uniqueId,
          result,
        ]),
      );


    } catch(error) {


      const message =
        error instanceof Error
          ? error.message
          : "Internal error";



      client.send(
        JSON.stringify([
          OCPP_MESSAGE_TYPE.CALL_ERROR,
          uniqueId,
          "InternalError",
          message,
          {},
        ]),
      );

    }

  }

}
