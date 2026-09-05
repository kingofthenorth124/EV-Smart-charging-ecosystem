import { Injectable } from "@nestjs/common";
import type { WebSocket } from "ws";

@Injectable()
export class OcppConnectionRegistry {

  private readonly connections = new Map<string, WebSocket>();

  register(
    chargePointId: string,
    socket: WebSocket,
  ): void {

    const existing = this.connections.get(chargePointId);

    if (existing && existing !== socket) {
      try {
        existing.close(
          1000,
          "Replaced by new connection",
        );
      } catch {}
    }

    this.connections.set(
      chargePointId,
      socket,
    );
  }


  remove(
    chargePointId: string,
  ): void {

    this.connections.delete(chargePointId);

  }


  get(
    chargePointId: string,
  ): WebSocket | undefined {

    return this.connections.get(chargePointId);

  }


  isConnected(
    chargePointId: string,
  ): boolean {

    return this.connections.has(chargePointId);

  }


  send(
    chargePointId: string,
    payload: string,
  ): boolean {

    const socket =
      this.connections.get(
        chargePointId,
      );


    if (!socket) {
      return false;
    }


    if (socket.readyState !== 1) {
      return false;
    }


    socket.send(payload);

    return true;
  }


}
