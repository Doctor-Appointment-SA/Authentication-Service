import { Response } from "express";

export async function AttachRefreshTokenToHeader(refresh_token: string, res: Response) {
  // insert refresh_token in the response
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refresh_token, {
    httpOnly: true, // not allow frontend to read it
    sameSite: 'lax',
    secure: isProd,
    path: '/', 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}
