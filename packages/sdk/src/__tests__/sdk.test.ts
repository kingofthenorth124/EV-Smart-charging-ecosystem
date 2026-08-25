import { describe, it, expect } from "vitest";
import { SdkError, isSdkError, extractErrorMessage } from "../errors";
import { wrapResult } from "../types";

describe("SdkError", () => {
  it("constructs with all fields from an ApiErrorResponse", () => {
    const err = new SdkError({
      statusCode: 422,
      message: "Validation failed",
      error: "UnprocessableEntity",
      correlationId: "corr-abc",
      details: [{ field: "email", message: "Invalid email" }],
    });

    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Validation failed");
    expect(err.error).toBe("UnprocessableEntity");
    expect(err.correlationId).toBe("corr-abc");
    expect(err.details?.[0]?.field).toBe("email");
  });

  it("is an instanceof Error", () => {
    const err = new SdkError({ statusCode: 500, message: "Server error" });
    expect(err instanceof Error).toBe(true);
    expect(err instanceof SdkError).toBe(true);
  });

  it("isUnauthorized is true for 401", () => {
    const err = new SdkError({ statusCode: 401, message: "Unauthorized" });
    expect(err.isUnauthorized).toBe(true);
    expect(err.isForbidden).toBe(false);
  });

  it("isForbidden is true for 403", () => {
    expect(
      new SdkError({ statusCode: 403, message: "Forbidden" }).isForbidden,
    ).toBe(true);
  });

  it("isNotFound is true for 404", () => {
    expect(
      new SdkError({ statusCode: 404, message: "Not found" }).isNotFound,
    ).toBe(true);
  });

  it("isConflict is true for 409", () => {
    expect(
      new SdkError({ statusCode: 409, message: "Conflict" }).isConflict,
    ).toBe(true);
  });

  it("isServerError is true for 5xx", () => {
    expect(
      new SdkError({ statusCode: 500, message: "Error" }).isServerError,
    ).toBe(true);
    expect(
      new SdkError({ statusCode: 503, message: "Error" }).isServerError,
    ).toBe(true);
  });

  it("isRateLimited is true for 429", () => {
    expect(
      new SdkError({ statusCode: 429, message: "Too many requests" })
        .isRateLimited,
    ).toBe(true);
  });

  it("isValidationError is true for 400 with details", () => {
    const err = new SdkError({
      statusCode: 400,
      message: "Bad request",
      details: [{ field: "name", message: "Required" }],
    });
    expect(err.isValidationError).toBe(true);
  });
});

describe("isSdkError", () => {
  it("returns true for SdkError instances", () => {
    expect(isSdkError(new SdkError({ statusCode: 400, message: "Bad" }))).toBe(
      true,
    );
  });

  it("returns false for generic errors", () => {
    expect(isSdkError(new Error("generic"))).toBe(false);
    expect(isSdkError("string error")).toBe(false);
    expect(isSdkError(null)).toBe(false);
  });
});

describe("extractErrorMessage", () => {
  it("extracts message from SdkError", () => {
    const err = new SdkError({ statusCode: 400, message: "Invalid input" });
    expect(extractErrorMessage(err)).toBe("Invalid input");
  });

  it("extracts message from generic Error", () => {
    expect(extractErrorMessage(new Error("network failure"))).toBe(
      "network failure",
    );
  });

  it("returns string errors as-is", () => {
    expect(extractErrorMessage("something went wrong")).toBe(
      "something went wrong",
    );
  });

  it("returns a fallback for unknown errors", () => {
    expect(extractErrorMessage(null)).toBe(
      "An unexpected error occurred. Please try again.",
    );
    expect(extractErrorMessage(42)).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });
});

describe("wrapResult", () => {
  it("returns ok:true with data on success", async () => {
    const result = await wrapResult(() => Promise.resolve(42));
    expect(result).toEqual({ ok: true, data: 42 });
  });

  it("returns ok:false with SdkError on failure", async () => {
    const sdkErr = new SdkError({ statusCode: 404, message: "Not found" });
    const result = await wrapResult(() => Promise.reject(sdkErr));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(sdkErr);
    }
  });

  it("re-throws non-SdkError errors", async () => {
    const networkErr = new TypeError("fetch failed");
    await expect(wrapResult(() => Promise.reject(networkErr))).rejects.toThrow(
      "fetch failed",
    );
  });
});
