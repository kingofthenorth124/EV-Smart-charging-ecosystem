import WebSocket from "ws";


const CHARGE_POINT_ID = "CP-TEST-001";


const ws =
  new WebSocket(
    `ws://localhost:3000/ocpp/${CHARGE_POINT_ID}`,
    "ocpp1.6",
  );


ws.on("open", () => {

  console.log(
    "✅ Mock charger connected",
  );

});


ws.on("message", (data) => {

  const frame =
    JSON.parse(
      data.toString(),
    );


  console.log(
    "⬅️ Received OCPP command:",
    frame,
  );


  const [
    messageType,
    messageId,
    action,
  ] = frame;


  if (messageType === 2) {

    console.log(
      `Command received: ${action}`,
    );


    const response = [
      3,
      messageId,
      {
        status:
          "Accepted",
      },
    ];


    ws.send(
      JSON.stringify(response),
    );


    console.log(
      "➡️ CALL_RESULT sent",
    );
  }

});


ws.on("close", () => {

  console.log(
    "❌ Charger disconnected",
  );

});


ws.on("error", (err) => {

  console.error(
    err,
  );

});
