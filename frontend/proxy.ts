import { NextResponse } from "next/server";

import { auth } from "@/auth";

const publicRoutes = ["/sign-in", "/sign-up"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/sign-in", req.nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
