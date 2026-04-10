import './import-routes';
import { writeFileSync } from 'fs';
import { z } from 'zod';
import { routes } from './registry';

// Helper to convert Zod schema to JSON Schema for OpenAPI (Zod v4 native API)
function schemaToJsonSchema(schema: unknown): Record<string, unknown> | undefined {
  if (!schema) return undefined;

  try {
    // Zod v4 native JSON Schema conversion; zod-to-json-schema is incompatible with Zod v4
    const jsonSchema = z.toJSONSchema(schema as z.ZodType, {
      target: 'openapi-3.0',
      unrepresentable: 'any', // Handle z.any() etc. as {}
    });

    if (!jsonSchema || typeof jsonSchema !== 'object') {
      return undefined;
    }

    // Remove root-level $schema (not needed in OpenAPI)
    const { $schema, ...rest } = jsonSchema as Record<string, unknown> & { $schema?: string };
    return rest as Record<string, unknown>;
  } catch (error) {
    console.warn('Failed to convert schema:', error);
    return { type: 'object' };
  }
}

function generateOpenAPISpec() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Timesheet API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Timesheet application',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        adminAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'admin_token',
          description: 'Admin/User authentication via HTTP-only cookie containing JWT token',
        },
        employeeAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'employee_token',
          description: 'Employee authentication via HTTP-only cookie containing JWT token',
        },
        deviceAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'device_token',
          description: 'Device authentication via HTTP-only cookie containing JWT token',
        },
      },
    },
    paths: {} as Record<string, any>,
    tags: [] as Array<{ name: string; description?: string }>,
  };

  // Collect unique tags
  const tagSet = new Set<string>();
  
  routes.forEach((route) => {
    route.tags?.forEach((tag: string) => tagSet.add(tag));
  });

  // Add tag definitions with better descriptions
  const tagDescriptions: Record<string, string> = {
    'Auth': 'Authentication and authorization endpoints',
    'Employees': 'Employee management operations',
    'Categories': 'Category management operations',
    'Locations': 'Location management operations',
    'Rosters': 'Roster and shift scheduling',
    'Schedules': 'Schedule templates and management',
    'Timesheets': 'Timesheet tracking and management',
    'Teams': 'Team management and availability',
    'Calendar': 'Calendar events and scheduling',
    'Awards': 'Award and recognition management',
    'Devices': 'Device registration and management',
    'Users': 'User account management',
    'Setup': 'Initial system setup',
    'Admin': 'Administrative operations',
    'Analytics': 'Reporting and analytics',
    'Dashboard': 'Dashboard statistics',
    'ShiftSwaps': 'Shift swap requests',
    'Flags': 'Feature flags',
    'FaceRecognition': 'Face recognition profiles',
    'Media': 'Media and image management',
    'Public': 'Public API endpoints',
    'Cron': 'Scheduled tasks and jobs',
  };

  spec.tags = Array.from(tagSet).sort().map(tag => ({
    name: tag,
    description: tagDescriptions[tag] || `Operations related to ${tag.toLowerCase()}`,
  }));

  // Track unique paths and methods
  const pathStats = new Map<string, Set<string>>();

  // Convert routes to OpenAPI paths
  routes.forEach((route) => {
    const { method, path, summary, description, tags, security, requestBody, parameters, responses } = route;

    // Track stats
    if (!pathStats.has(path)) {
      pathStats.set(path, new Set());
    }
    pathStats.get(path)!.add(method);

    // Initialize path if it doesn't exist
    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    // Build operation object
    const operation: any = {
      summary,
      description: description || summary,
      tags: tags || [],
      operationId: `${method}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`,
    };

    // Add security if specified
    if (security) {
      operation.security = security;
    }

    // Add parameters (query and path params)
    if (parameters && parameters.length > 0) {
      operation.parameters = parameters.map((param: any) => {
        const converted = schemaToJsonSchema(param.schema);
        return {
          name: param.name,
          in: param.in,
          required: param.in === 'path' || param.required || false,
          schema: converted || { type: 'string' },
          description: param.description || `${param.name} parameter`,
        };
      });
    }

    // Add request body
    if (requestBody) {
      const bodySchema = schemaToJsonSchema(requestBody.content['application/json'].schema);
      operation.requestBody = {
        required: requestBody.required ?? true,
        content: {
          'application/json': {
            schema: bodySchema,
          },
        },
      };
    }

    // Add responses
    if (responses) {
      operation.responses = {};
      Object.entries(responses).forEach(([status, response]: [string, any]) => {
        const responseSchema = schemaToJsonSchema(response.content['application/json'].schema);
        operation.responses[status] = {
          description: response.description || `Response ${status}`,
          content: {
            'application/json': {
              schema: responseSchema,
            },
          },
        };
      });
    } else {
      // Default response if none specified
      operation.responses = {
        200: {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      };
    }

    // Add operation to path
    spec.paths[path][method] = operation;
  });

  // Write to file
  const outputPath = 'public/openapi.json';
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf8');
  
  // Calculate stats
  const totalEndpoints = pathStats.size;
  const totalRoutes = Array.from(pathStats.values()).reduce((sum, methods) => sum + methods.size, 0);
  
  console.log(`✅ OpenAPI specification generated successfully!`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`🔗 Endpoints: ${totalEndpoints}`);
  console.log(`📊 Total routes: ${totalRoutes}`);
  console.log(`🔐 Security schemes: ${Object.keys(spec.components.securitySchemes).length}`);
  console.log(`🏷️  Tags: ${spec.tags.length}`);
}

// Run generation
generateOpenAPISpec();