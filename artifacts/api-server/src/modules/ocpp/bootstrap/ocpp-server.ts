import { Server } from "ws";
import { IncomingMessage } from "http";
import { OcppGateway } from "../gateway/ocpp.gateway";

export function startOcppServer(
  httpServer: any,
  gateway: OcppGateway,
) {

  const wss = new Server({
    noServer: true,
  });


  httpServer.on(
    "upgrade",
    (
      request: IncomingMessage,
      socket: any,
      head: Buffer,
    ) => {

      if (!request.url?.startsWith("/ocpp/")) {
        return;
      }


      wss.handleUpgrade(
        request,
        socket,
        head,
        (client) => {

          void gateway.handleConnection(
            client,
            request,
          );

        },
      );

    },
  );


  console.log(
    "Dedicated OCPP WebSocket server started",
  );


  return wss;
}
