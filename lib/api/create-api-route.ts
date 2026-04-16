import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, z } from 'zod';
import { routes } from '@/lib/openapi/registry';
import { isApiError } from '@/lib/api/api-error';

// Configuration object for createApiRoute
interface ApiRouteConfig<
  TBody extends ZodSchema = ZodSchema,
  TQuery extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TParams extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TResponse extends ZodSchema = ZodSchema
> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  security?: 'adminAuth' | 'employeeAuth' | 'deviceAuth' | 'none';
  request?: {
    body?: TBody;
    query?: TQuery;
    params?: TParams;
  };
  responses: Record<number, TResponse>;
  handler: (data: {
    body: z.infer<TBody> | undefined;
    query: z.infer<TQuery> | undefined;
    params: z.infer<TParams> | undefined;
    req: NextRequest;
    context: { params?: Promise<Record<string, string>> | Record<string, string> };
  }) => Promise<{ status: number; data: unknown }>;
}

// Helper to create typed API routes that auto-register to OpenAPI
export function createApiRoute<
  TBody extends ZodSchema = ZodSchema,
  TQuery extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TParams extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TResponse extends ZodSchema = ZodSchema
>(config: ApiRouteConfig<TBody, TQuery, TParams, TResponse>) {
  // Auto-register route to routes array for OpenAPI generation
  const routeSpec = {
    method: config.method.toLowerCase(),
    path: config.path,
    summary: config.summary,
    description: config.description,
    tags: config.tags,
    security: config.security && config.security !== 'none' 
      ? [{ [config.security]: [] }] 
      : undefined,
    requestBody: config.request?.body ? {
      required: true,
      content: {
        'application/json': {
          schema: config.request.body
        }
      }
    } : undefined,
    parameters: [
      // Individual query parameters
      ...(config.request?.query
        ? (() => {
            const querySchema = config.request.query!;
            return Object.keys(querySchema.shape).map(key => ({
              name: key,
              in: 'query' as const,
              schema: querySchema.shape[key]
            }));
          })()
        : []
      ),
      // Individual path parameters
      ...(config.request?.params
        ? (() => {
            const paramsSchema = config.request.params!;
            return Object.keys(paramsSchema.shape).map(key => ({
              name: key,
              in: 'path' as const,
              required: true,
              schema: paramsSchema.shape[key]
            }));
          })()
        : []
      )
    ],
    responses: Object.entries(config.responses).reduce((acc, [status, schema]) => {
      acc[status] = {
        description: `Response ${status}`,
        content: {
          'application/json': {
            schema
          }
        }
      };
      return acc;
    }, {} as Record<string, unknown>)
  };

  routes.push(routeSpec);

  // Return the actual Next.js route handler
  return async (req: NextRequest, context: { params?: Promise<Record<string, string>> | Record<string, string> }) => {
    try {
      // Resolve params for Next.js 15 compatibility
      const resolvedParams = context.params instanceof Promise 
        ? await context.params 
        : context.params;

      // Parse and validate request body
      let body: z.infer<TBody> | undefined = undefined;
      if (config.request?.body) {
        try {
          const rawBody = await req.json();
          body = config.request.body.parse(rawBody) as z.infer<TBody>;
        } catch (error) {
          return NextResponse.json(
            { 
              error: 'Invalid request body', 
              details: (error instanceof z.ZodError) ? (error as z.ZodError).issues : 'Malformed JSON'
            },
            { status: 400 }
          );
        }
      }

      // Parse and validate query parameters
      let query: z.infer<TQuery> | undefined = undefined;
      if (config.request?.query) {
        try {
          const searchParams = req.nextUrl.searchParams;
          // Build query object respecting repeated params (e.g. ?employeeId=a&employeeId=b).
          // Object.fromEntries() would drop all but the last value for repeated keys.
          const queryShape = config.request.query.shape;
          const queryObject: Record<string, string | string[]> = {};
          for (const key of Object.keys(queryShape)) {
            const all = searchParams.getAll(key);
            if (all.length === 0) continue;
            // If the schema shape for this key is an array type, keep as array;
            // otherwise collapse to a single string.
            const fieldSchema = queryShape[key];
            const isArrayField =
              fieldSchema instanceof z.ZodArray ||
              (fieldSchema instanceof z.ZodOptional && fieldSchema._def.innerType instanceof z.ZodArray) ||
              (fieldSchema instanceof z.ZodDefault && fieldSchema._def.innerType instanceof z.ZodOptional &&
                (fieldSchema._def.innerType as z.ZodOptional<z.ZodTypeAny>)._def.innerType instanceof z.ZodArray);
            queryObject[key] = isArrayField ? all : all[all.length - 1]!;
          }
          query = config.request.query.parse(queryObject) as z.infer<TQuery>;
        } catch (error) {
          return NextResponse.json(
            { 
              error: 'Invalid query parameters', 
              details: (error instanceof z.ZodError) ? (error as z.ZodError).issues : 'Invalid format'
            },
            { status: 400 }
          );
        }
      }

      // Parse path parameters from context
      let params: z.infer<TParams> | undefined = undefined;
      if (config.request?.params && resolvedParams) {
        try {
          params = config.request.params.parse(resolvedParams) as z.infer<TParams>;
        } catch (error) {
          return NextResponse.json(
            { 
              error: 'Invalid path parameters', 
              details: (error instanceof z.ZodError) ? (error as z.ZodError).issues : 'Invalid format'
            },
            { status: 400 }
          );
        }
      } else if (resolvedParams && !config.request?.params) {
        // Dynamic segments from the file path are still passed in `context.params`;
        // many handlers read them without declaring `request.params` in the route config.
        params = resolvedParams as z.infer<TParams>;
      }

      // Call handler with validated typed data
      const result = await config.handler({
        body,
        query,
        params,
        req,
        context: { params: resolvedParams }
      });

      // Return NextResponse.json with status from handler result
      return NextResponse.json(result.data, { status: result.status });

    } catch (error) {
      if (isApiError(error)) {
        const details = process.env.NODE_ENV === 'development' ? error.details : undefined;
        const existingId =
          details && typeof details === 'object' && details !== null && 'existingId' in details
            ? (details as any).existingId
            : undefined;
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details,
            existingId,
          },
          { status: error.status }
        );
      }
      // Catch errors and return 500 with error message
      console.error('API Route Error:', error);
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        { status: 500 }
      );
    }
  };
}