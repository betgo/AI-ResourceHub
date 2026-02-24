import { NextResponse } from "next/server";

type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export function apiError(status: number, payload: ApiErrorPayload) {
  return NextResponse.json(
    {
      error: payload,
    },
    { status },
  );
}

export function apiSuccess<T>(status: number, data: T) {
  return NextResponse.json(
    {
      data,
    },
    { status },
  );
}
