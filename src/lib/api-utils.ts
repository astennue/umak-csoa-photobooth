import { NextRequest, NextResponse } from 'next/server';

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export function successResponse(data: any, status = 200, extra?: Partial<ApiResponse>): NextResponse {
  const meta = extra ? { total: extra.total, page: extra.page, limit: extra.limit } : undefined;
  return NextResponse.json(
    { success: true, data, ...extra, ...(meta ? { meta } : {}) },
    { status }
  );
}

export function errorResponse(error: string, status = 400): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

export function paginateRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function getSearchParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return searchParams;
}
