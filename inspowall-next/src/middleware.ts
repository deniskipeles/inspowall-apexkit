import { type NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const match = pathname.match(/^\/@([^/]+)(\/.*)?$/);
  if (match) {
    const username = match[1];
    const rest = match[2] || '';
    const url = req.nextUrl.clone();
    url.pathname = `/u/${username}${rest}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};