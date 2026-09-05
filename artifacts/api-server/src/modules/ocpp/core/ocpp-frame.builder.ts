import { randomUUID } from "crypto";
import { OCPP_MESSAGE_TYPE } from "./ocpp.constants";


export function buildCallFrame(
  action: string,
  payload: any,
) {

  const messageId =
    randomUUID();


  return JSON.stringify([
    OCPP_MESSAGE_TYPE.CALL,

    messageId,

    action,

    payload,
  ]);
}
