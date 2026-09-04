export type OcppCallFrame = {
  type: "CALL";
  uniqueId: string;
  action: string;
  payload: unknown;
};


export type OcppCallResultFrame = {
  type: "CALL_RESULT";
  uniqueId: string;
  payload: unknown;
};


export type OcppCallErrorFrame = {
  type: "CALL_ERROR";
  uniqueId: string;
  errorCode: string;
  errorDescription: string;
  details: unknown;
};


export type OcppFrame =
  | OcppCallFrame
  | OcppCallResultFrame
  | OcppCallErrorFrame;
