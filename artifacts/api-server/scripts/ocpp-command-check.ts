import { buildCallFrame } from "../src/modules/ocpp/core/ocpp-frame.builder";


async function main() {

  const frame =
    buildCallFrame(
      "RemoteStartTransaction",
      {
        connectorId: 1,
        idTag: "TEST_USER",
      },
    );


  console.log("================================");
  console.log("OCPP COMMAND FRAME CHECK");
  console.log("================================");

  console.log(frame);

  const parsed =
    JSON.parse(frame);


  console.log("--------------------------------");
  console.log("Message Type:", parsed[0]);
  console.log("Message ID:", parsed[1]);
  console.log("Action:", parsed[2]);
  console.log("Payload:", parsed[3]);

}


main();
