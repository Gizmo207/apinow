/**
 * OpenAPI 3.0 Generator for APIFlow
 * Generates Swagger documentation for saved API endpoints
 */

export interface APIEndpoint {
  id: string;
  name: string;
  path: string;
  method: string;
  collection: string;
  description?: string;
  isPublic: boolean;
  connectionId: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: {
        summary: string;
        description?: string;
        tags: string[];
        security?: Array<{ [key: string]: string[] }>;
        parameters?: Array<{
          name: string;
          in: string;
          required: boolean;
          schema: { type: string };
          description?: string;
        }>;
        requestBody?: {
          required: boolean;
          content: {
            'application/json': {
              schema: {
                type: string;
                properties?: any;
              };
            };
          };
        };
        responses: {
          [status: string]: {
            description: string;
            content?: {
              'application/json': {
                schema: any;
              };
            };
          };
        };
      };
    };
  };
  components: {
    securitySchemes: {
      ApiKeyAuth?: {
        type: string;
        in: string;
        name: string;
      };
      BearerAuth?: {
        type: string;
        scheme: string;
      };
    };
  };
}

export function generateOpenAPI(
  endpoints: APIEndpoint[],
  projectName: string,
  baseUrl: string
): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: `${projectName} API`,
      version: '1.0.0',
      description: `Auto-generated API documentation for ${projectName}. This API provides access to your database through REST endpoints.`,
    },
    servers: [
      {
        url: `${baseUrl}/api/public`,
        description: 'Public API (requires API key)',
      },
      {
        url: `${baseUrl}/api/dynamic`,
        description: 'Protected API (requires Firebase authentication)',
      },
    ],
    paths: {},
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'query',
          name: 'key',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  };

  // Group endpoints by path
  endpoints.forEach((endpoint) => {
    const cleanPath = endpoint.path.replace('/api/dynamic', '').replace('/api/public', '');
    const method = endpoint.method.toLowerCase();

    if (!spec.paths[cleanPath]) {
      spec.paths[cleanPath] = {};
    }

    const operation: any = {
      summary: endpoint.name || `${endpoint.method} ${endpoint.collection}`,
      description: endpoint.description || `${endpoint.method} operation on ${endpoint.collection} collection`,
      tags: [endpoint.collection],
      security: endpoint.isPublic
        ? [{ ApiKeyAuth: [] }]
        : [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: method === 'get' && !cleanPath.includes(':id') ? 'array' : 'object',
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized - Invalid or missing API key/token',
        },
        '404': {
          description: 'Endpoint not found',
        },
        '500': {
          description: 'Server error',
        },
      },
    };

    // Add path parameters for :id routes
    if (cleanPath.includes(':id')) {
      operation.parameters = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Document ID',
        },
      ];
    }

    // Add request body for POST/PUT methods
    if (method === 'post' || method === 'put') {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                // Generic properties - users can customize
                data: {
                  type: 'object',
                  description: 'Document data',
                },
              },
            },
          },
        },
      };
    }

    spec.paths[cleanPath][method] = operation;
  });

  return spec;
}

/**
 * Generate OpenAPI spec as YAML string
 */
export function generateOpenAPIYAML(spec: OpenAPISpec): string {
  // Simple YAML generator (for production, consider using a library like 'js-yaml')
  const yaml: string[] = [];

  yaml.push(`openapi: ${spec.openapi}`);
  yaml.push('info:');
  yaml.push(`  title: "${spec.info.title}"`);
  yaml.push(`  version: "${spec.info.version}"`);
  yaml.push(`  description: "${spec.info.description}"`);
  yaml.push('');

  yaml.push('servers:');
  spec.servers.forEach((server) => {
    yaml.push(`  - url: ${server.url}`);
    yaml.push(`    description: ${server.description}`);
  });
  yaml.push('');

  yaml.push('paths:');
  Object.entries(spec.paths).forEach(([path, methods]) => {
    yaml.push(`  ${path}:`);
    Object.entries(methods).forEach(([method, operation]) => {
      yaml.push(`    ${method}:`);
      yaml.push(`      summary: "${operation.summary}"`);
      if (operation.description) {
        yaml.push(`      description: "${operation.description}"`);
      }
      yaml.push(`      tags:`);
      operation.tags.forEach((tag: string) => {
        yaml.push(`        - ${tag}`);
      });
      if (operation.security) {
        yaml.push(`      security:`);
        operation.security.forEach((sec: any) => {
          const key = Object.keys(sec)[0];
          yaml.push(`        - ${key}: []`);
        });
      }
      yaml.push(`      responses:`);
      Object.entries(operation.responses).forEach(([status, response]: [string, any]) => {
        yaml.push(`        '${status}':`);
        yaml.push(`          description: ${response.description}`);
      });
    });
  });

  return yaml.join('\n');
}
