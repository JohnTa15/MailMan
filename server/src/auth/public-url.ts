import { Request } from 'express';

/** The address people use to reach this server, for OAuth redirect URIs and links. */
export function publicUrl(req: Request) {
  return (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}
