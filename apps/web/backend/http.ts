import { NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function errorResponse(error: unknown, fallback = 'Request failed') {
  if (error instanceof ApiError) {
    return json({ error: error.message }, { status: error.status })
  }

  const message = error instanceof Error ? error.message : fallback
  return json({ error: message }, { status: 500 })
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json() as Record<string, unknown>
  } catch {
    return {}
  }
}
