import {
  OCPP_MESSAGE_TYPE,
} from "./ocpp.constants";

import type {
  OcppFrame,
} from "./ocpp-frame.types";


export function parseOcppFrame(
  input: unknown,
): OcppFrame {


  if (!Array.isArray(input)) {
    throw new Error("Invalid OCPP frame");
  }


  switch (input[0]) {

    case OCPP_MESSAGE_TYPE.CALL:

      return {
        type: "CALL",
        uniqueId: String(input[1]),
        action: String(input[2]),
        payload: input[3],
      };


    case OCPP_MESSAGE_TYPE.CALL_RESULT:

      return {
        type: "CALL_RESULT",
        uniqueId: String(input[1]),
        payload: input[2],
      };


    case OCPP_MESSAGE_TYPE.CALL_ERROR:

      return {
        type: "CALL_ERROR",
        uniqueId: String(input[1]),
        errorCode: String(input[2]),
        errorDescription: String(input[3]),
        details: input[4],
      };


    default:

      throw new Error(
        "Unknown OCPP message type",
      );
  }
}
