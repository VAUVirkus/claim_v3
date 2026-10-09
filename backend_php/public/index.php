<?php

declare(strict_types=1);

/**
 * AS Viljandi Aken ja Uks - Claim Management System v3.0
 * Public Entry Point (Spec 6.1: DocumentRoot)
 * All business logic, models, controllers and configuration remain outside the webroot.
 */

// Simple autoloader for PSR-4 Vau\Claim\
spl_autoload_register(function (string $class) {
    $prefix = 'Vau\\Claim\\';
    $baseDir = dirname(__DIR__) . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

use Vau\Claim\Router;
use Vau\Claim\Controllers\ClassifierController;
use Vau\Claim\Controllers\ClaimController;
use Vau\Claim\Controllers\SyncController;

$router = new Router();

// System & Health
$router->get('/', [ClassifierController::class, 'rootInfo']);
$router->get('/api/health', [ClassifierController::class, 'health']);

// Authentication & Client Verification (Spec 2.4 F2)
$router->post('/api/auth/client', [ClassifierController::class, 'verifyClient']);

// Master Data & Classifiers (Spec 2.4 F13, F15, F16)
$router->get('/api/categories', [ClassifierController::class, 'getCategories']);
$router->get('/api/defect-types', [ClassifierController::class, 'getDefectTypes']);
$router->get('/api/teams', [ClassifierController::class, 'getTeams']);
$router->get('/api/cost-accounts', [ClassifierController::class, 'getCostAccounts']);
$router->get('/api/handlers', [ClassifierController::class, 'getHandlers']);
$router->get('/api/users', [ClassifierController::class, 'getUsers']);
$router->get('/api/clients', [ClassifierController::class, 'getClients']);
$router->get('/api/sales-reps', [ClassifierController::class, 'getSalesReps']);
$router->get('/api/salesreps', [ClassifierController::class, 'getSalesReps']);
$router->get('/api/reports/sense', [ClassifierController::class, 'getSenseReports']);
$router->get('/api/sense/reports', [ClassifierController::class, 'getSenseReports']);

// Claims Endpoints (Spec 2.4 F1, F5, F6)
$router->get('/api/claims', [ClaimController::class, 'index']);
$router->get('/api/claims/{id}', [ClaimController::class, 'show']);
$router->post('/api/claims', [ClaimController::class, 'create']);
$router->patch('/api/claims/{id}/status', [ClaimController::class, 'updateStatus']);
$router->patch('/api/claims/{id}/action-plan', [ClaimController::class, 'updateActionPlan']);
$router->patch('/api/claims/{id}/replacement-order', [ClaimController::class, 'updateReplacementOrder']);
$router->patch('/api/claims/{id}/defect-type', [ClaimController::class, 'updateDefectType']);
$router->patch('/api/claims/{id}/cost-allocations', [ClaimController::class, 'updateCostAllocations']);
$router->post('/api/claims/{id}/invoices', [ClaimController::class, 'addInvoice']);
$router->post('/api/claims/{id}/files', [ClaimController::class, 'addFile']);
$router->post('/api/claims/{id}/emails', [ClaimController::class, 'addEmail']);
$router->post('/api/claims/{id}/notes', [ClaimController::class, 'addNote']);
$router->post('/api/claims/{id}/handlers', [ClaimController::class, 'assignHandlers']);
$router->post('/api/claims/{id}/service', [ClaimController::class, 'assignService']);
$router->post('/api/claims/{id}/cost-proposals', [ClaimController::class, 'submitCostProposal']);
$router->post('/api/claims/{id}/cost-proposals/{propId}/approve', [ClaimController::class, 'approveCostProposal']);
$router->post('/api/claims/reseed', [ClaimController::class, 'reseed']);

// Offline Sync Endpoint (Spec 2.4 F25, 4.3)
$router->post('/api/sync', [SyncController::class, 'sync']);

// Dispatch request
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';

$router->dispatch($method, $uri);
