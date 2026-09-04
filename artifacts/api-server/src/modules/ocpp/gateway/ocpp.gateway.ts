import { Logger } from "@nestjs/common";
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


const CALL = 2;
const CALL_RESULT = 3;
const CALL_ERROR = 4;


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



@WebSocketGateway({
  path: "/ocpp",
})
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
  ) {}



  async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {


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
        "Rejected connection without charge point id",
      );

      client.close();

      return;
    }



    this.chargePointBySocket.set(
      client,
      chargePointId,
    );



    this.registry.register(
      chargePointId,
      client,
    );



    await this.connectionService.register(
      chargePointId,
      client,
      request.socket.remoteAddress,
    );



    client.on(
      "message",
      (raw: Buffer) => {

        void this.handleMessage(
          client,
          chargePointId,
          raw,
        );

      },
    );


    this.logger.log(
      `OCPP charger connected: ${chargePointId}`,
    );
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



    let frame: unknown;


    try {

      frame =
        JSON.parse(
          raw.toString("utf8"),
        );

    } catch {

      this.logger.warn(
        `Invalid JSON from ${chargePointId}`,
      );

      return;

    }



    if (
      !Array.isArray(frame) ||
      frame[0] !== CALL
    ) {
      return;
    }



    const [
      ,
      uniqueId,
      action,
      payload,
    ] = frame as [
      number,
      string,
      string,
      unknown,
    ];



    try {


      const result =
        await this.messageRouter.route(
          chargePointId,
          action,
          payload,
        );



      client.send(
        JSON.stringify([
          CALL_RESULT,
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
          CALL_ERROR,
          uniqueId,
          "InternalError",
          message,
          {},
        ]),
      );

    }

  }

}
