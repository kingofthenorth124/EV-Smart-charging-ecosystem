import type {
  OcppFrame,
} from "./ocpp-frame.types";


export function validateOcppFrame(
  frame: OcppFrame,
): void {


  if (!frame.uniqueId) {
    throw new Error(
      "Missing OCPP uniqueId",
    );
  }


  if (
    frame.type === "CALL" &&
    !frame.action
  ) {
    throw new Error(
      "Missing OCPP action",
    );
  }

}
