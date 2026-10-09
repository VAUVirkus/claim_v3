<?php

namespace Vau\Claim;

/**
 * Lightweight REST Router for Claim Management System v3.0
 */
class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): self
    {
        return $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): self
    {
        return $this->add('POST', $path, $handler);
    }

    public function patch(string $path, callable $handler): self
    {
        return $this->add('PATCH', $path, $handler);
    }

    public function delete(string $path, callable $handler): self
    {
        return $this->add('DELETE', $path, $handler);
    }

    public function options(string $path, callable $handler): self
    {
        return $this->add('OPTIONS', $path, $handler);
    }

    private function add(string $method, string $path, callable $handler): self
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $this->convertPattern($path),
            'handler' => $handler,
        ];
        return $this;
    }

    private function convertPattern(string $path): string
    {
        // Convert /api/claims/{id} into regex pattern
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    public function dispatch(string $method, string $uri): void
    {
        // Strip query string
        $path = parse_url($uri, PHP_URL_PATH);

        // Normalize trailing slash
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        // Handle CORS pre-flight
        if ($method === 'OPTIONS') {
            $this->sendCorsHeaders();
            http_response_code(204);
            exit;
        }

        $this->sendCorsHeaders();

        // Parse JSON body
        $rawBody = file_get_contents('php://input');
        $body = [];
        if (!empty($rawBody)) {
            $body = json_decode($rawBody, true) ?? [];
        }

        // Parse query params
        $query = $_GET ?? [];

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['pattern'], $path, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                
                try {
                    $response = call_user_func($route['handler'], [
                        'params' => $params,
                        'body' => $body,
                        'query' => $query,
                    ]);

                    if (is_array($response) || is_object($response)) {
                        header('Content-Type: application/json; charset=utf-8');
                        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                    } elseif (is_string($response)) {
                        echo $response;
                    }
                    return;
                } catch (\Throwable $e) {
                    http_response_code(500);
                    header('Content-Type: application/json; charset=utf-8');
                    echo json_encode([
                        'error' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ], JSON_UNESCAPED_UNICODE);
                    return;
                }
            }
        }

        // No route matched
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Endpoint not found', 'path' => $path, 'method' => $method]);
    }

    private function sendCorsHeaders(): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
    }
}
