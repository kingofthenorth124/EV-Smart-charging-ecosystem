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

/**
 * OCPP-J (JSON-over-WebSocket) call frame:
 *   [2, "<uniqueId>", "<action>", { ...payload }]
 * Result frame:
 *   [3, "<uniqueId>", { ...payload }]
 * Error frame:
 *   [4, "<uniqueId>", "<errorCode>", "<errorDescription>", {}]
 */
const CALL = 2;
const CALL_RESULT = 3;
const CALL_ERROR = 4;

function extractChargePointId(request: IncomingMessage): string | null {
  // Charge points connect at ws://host/ocpp/<chargePointId>
  const url = request.url ?? "";
  const segments = url.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

@WebSocketGateway({ path: "/ocpp" })
export class OcppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OcppGateway.name);
  private readonly chargePointIdBySocket = new WeakMap<WebSocket, string>();

  constructor(
    private readonly connectionService: OcppConnectionService,
    private readonly messageRouter: OcppMessageRouter,
  ) {}

  async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    const chargePointId = extractChargePointId(request);

    if (!chargePointId) {
      this.logger.warn("Rejected OCPP connection with no charge point id");
      client.close();
      return;
    }

    this.chargePointIdBySocket.set(client, chargePointId);

    await this.connectionService.register(
      chargePointId,
      client,
      request.socket.remoteAddress,
    );

    client.on("message", (raw: Buffer) => {
      void this.handleMessage(client, chargePointId, raw);
    });

    this.logger.log(`Charge point connected: ${chargePointId}`);
  }

  async handleDisconnect(client: WebSocket): Promise<void> {
    const chargePointId = this.chargePointIdBySocket.get(client);
    if (!chargePointId) return;

    await this.connectionService.remove(chargePointId);
    this.logger.log(`Charge point disconnected: ${chargePointId}`);
  }

  private async handleMessage(
    client: WebSocket,
    chargePointId: string,
    raw: Buffer,
  ): Promise<void> {
    await this.connectionService.touch(chargePointId);

    let frame: unknown;
    try {
      frame = JSON.parse(raw.toString("utf8"));
    } catch {
      this.logger.warn(`Malformed OCPP frame from ${chargePointId}`);
      return;
    }

    if (!Array.isArray(frame) || frame[0] !== CALL) {
      // We only act as a CALL receiver here; ignore result/error frames
      // that would be responses to charge-point-initiated calls we don't send yet.
      return;
    }

    const [, uniqueId, action, payload] = frame as [
      number,
      string,
      string,
      unknown,
    ];

    try {
      const result = await this.messageRouter.route(
        chargePointId,
        action,
        payload,
      );
      client.send(JSON.stringify([CALL_RESULT, uniqueId, result]));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      client.send(
        JSON.stringify([CALL_ERROR, uniqueId, "InternalError", message, {}]),
      );
    }
  }
}
