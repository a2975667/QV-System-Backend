// Shared by bootstrap and HTTP regression tests. Origin/credentials policy is
// unchanged; the browser must be able to read an authenticated renewal header.
export const corsOptions = {
  origin: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  exposedHeaders: ['X-New-Access-Token'],
};

export function safeRequestPath(url: string): string {
  return url.split(/[?#]/, 1)[0].replace(/[\u0000-\u001f\u007f]/g, '');
}
