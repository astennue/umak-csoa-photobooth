import { NextRequest, NextResponse } from 'next/server';

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  meta?: ApiMeta;
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

/**
 * Success response with proper { data, meta } format.
 * - For paginated lists, pass extra: { total, page, limit } to get a meta object.
 * - Top-level total/page/limit are also included for backward compatibility.
 * - For single items, omit extra (no meta).
 */
export function successResponse(data: any, status = 200, extra?: ApiMeta): NextResponse {
  const response: ApiResponse = {
    success: true,
    data,
  };
  if (extra && (extra.total !== undefined || extra.page !== undefined || extra.limit !== undefined)) {
    response.meta = {
      ...(extra.total !== undefined && { total: extra.total }),
      ...(extra.page !== undefined && { page: extra.page }),
      ...(extra.limit !== undefined && { limit: extra.limit }),
    };
    // Also include at top level for backward compatibility
    if (extra.total !== undefined) response.total = extra.total;
    if (extra.page !== undefined) response.page = extra.page;
    if (extra.limit !== undefined) response.limit = extra.limit;
  }
  return NextResponse.json(response, { status });
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
