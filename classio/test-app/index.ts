const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === '/') {
    return new Response('Hello from Classio Platform!', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  if (url.pathname === '/api/test') {
    return Response.json({ message: 'API works!', timestamp: Date.now() });
  }

  return new Response('Not found', { status: 404 });
};

export default handler;
