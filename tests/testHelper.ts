export interface MockResult {
  status: number;
  body: any;
}

export function createMockContext(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
}) {
  let statusCode = 200;
  let responseBody: any = null;
  let resolveDone: (() => void) | null = null;
  const donePromise = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const headersNormalized: Record<string, string> = {};
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headersNormalized[k.toLowerCase()] = v;
    }
  }

  const req: any = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: headersNormalized,
    header(key: string) {
      return headersNormalized[key.toLowerCase()];
    },
    params: options.params || {},
    body: options.body || {},
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseBody = data;
      if (resolveDone) resolveDone();
      return res;
    },
    send(data: any) {
      responseBody = data;
      if (resolveDone) resolveDone();
      return res;
    },
    setHeader() {
      return res;
    },
  };

  return {
    req,
    res,
    waitDone: async (timeoutMs = 300): Promise<MockResult> => {
      await Promise.race([
        donePromise,
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
      return {
        status: statusCode,
        body: responseBody,
      };
    },
    getResult: (): MockResult => ({
      status: statusCode,
      body: responseBody,
    }),
  };
}
