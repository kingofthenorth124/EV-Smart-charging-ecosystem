import { INestApplicationContext } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";

export class OcppWsAdapter extends WsAdapter {

  constructor(
    app: INestApplicationContext,
  ) {
    super(app);
  }


  bindClientConnect(
    server: any,
    callback: Function,
  ) {

    server.on(
      "connection",
      (
        client: any,
        request: any,
      ) => {

        console.log(
          "OCPP ADAPTER CONNECTION:",
          request.url,
        );

        callback(
          client,
          request,
        );
      },
    );
  }
}
