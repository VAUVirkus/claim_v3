<?php

namespace Vau\Claim\Controllers;

use Vau\Claim\Data;

class ClassifierController
{
    public static function rootInfo(): array
    {
        return [
            'name' => 'VAU Claim Management System v3.0 REST API',
            'status' => 'ok',
            'version' => '3.0.0-php',
            'frontend_url' => 'http://localhost:5173',
            'message' => 'See on backendi API teenus. Kasutajaliides asub aadressil http://localhost:5173 (käivita frontend kaustas "npm run dev").',
            'endpoints' => [
                'health' => '/api/health',
                'claims' => '/api/claims',
                'categories' => '/api/categories',
                'defect_types' => '/api/defect-types',
            ],
        ];
    }

    public static function health(): array
    {
        return [
            'status' => 'ok',
            'version' => '3.0.0-php',
            'engine' => 'PHP ' . PHP_VERSION,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    public static function getCategories(): array
    {
        return Data::getCategories();
    }

    public static function getDefectTypes(): array
    {
        return Data::getDefectTypes();
    }

    public static function getTeams(): array
    {
        return Data::getServiceTeams();
    }

    public static function getCostAccounts(): array
    {
        return Data::getCostAccounts();
    }

    public static function getHandlers(): array
    {
        return Data::getHandlers();
    }

    public static function getUsers(): array
    {
        return Data::getUsers();
    }

    public static function verifyClient(array $req): array
    {
        $code = trim($req['body']['code'] ?? '');
        if (empty($code)) {
            http_response_code(400);
            return ['success' => false, 'message' => 'Client code is required'];
        }

        $dealers = Data::getDealers();
        foreach ($dealers as $d) {
            if (strcasecmp($d['code'], $code) === 0) {
                return [
                    'success' => true,
                    'dealer' => $d,
                ];
            }
        }

        // Allow test codes like TEST99
        if (str_starts_with(strtoupper($code), 'TEST')) {
            return [
                'success' => true,
                'dealer' => [
                    'code' => $code,
                    'name' => "Testklient ($code)",
                    'contactPerson' => 'Test Kasutaja',
                    'email' => 'test@vau.ee',
                    'phone' => '+372 5000 0000',
                    'address' => 'Puidu 1, Viljandi',
                    'country' => 'EST',
                    'isTest' => true,
                ],
            ];
        }

        http_response_code(404);
        return [
            'success' => false,
            'message' => 'Kehtetu edasimüüja kood. Kontrollige sisestust.',
        ];
    }

    public static function getClients(): array
    {
        return Data::getClients();
    }

    public static function getSalesReps(): array
    {
        return Data::getSalesReps();
    }

    public static function getSenseReports(): array
    {
        $db = \Vau\Claim\Database::getInstance();
        $claims = $db->getAllClaims();

        $byDefect = [];
        $byDept = [];
        $byDealer = [];
        $byStatus = [];
        $totalCost = 0.0;
        $totalInvoicesCount = 0;
        $totalInvoicesSum = 0.0;

        foreach ($claims as $c) {
            // Defect stats
            $dt = $c['defect']['typeName'] ?? $c['defect']['type'] ?? 'Määramata';
            $byDefect[$dt] = ($byDefect[$dt] ?? 0) + 1;

            // Status stats
            $st = $c['statusLabel'] ?? $c['status'] ?? 'Muu';
            $byStatus[$st] = ($byStatus[$st] ?? 0) + 1;

            // Dealer stats
            $dealer = $c['dealer']['name'] ?? 'Määramata';
            $byDealer[$dealer] = ($byDealer[$dealer] ?? 0) + 1;

            // Cost allocations
            foreach ($c['costAllocations'] ?? [] as $ca) {
                $dept = $ca['departmentName'] ?? $ca['departmentId'] ?? 'Muu osakond';
                $amt = (float)($ca['amountEur'] ?? 0);
                $byDept[$dept] = ($byDept[$dept] ?? 0) + $amt;
                $totalCost += $amt;
            }

            // Invoices
            foreach ($c['invoices'] ?? [] as $inv) {
                $totalInvoicesCount++;
                $totalInvoicesSum += (float)($inv['amountEur'] ?? 0);
            }
        }

        return [
            'totalClaims' => count($claims),
            'totalAllocatedCostEur' => round($totalCost, 2),
            'totalInvoicesSumEur' => round($totalInvoicesSum, 2),
            'totalInvoicesCount' => $totalInvoicesCount,
            'averageResolutionDays' => 4.2,
            'byDefect' => $byDefect,
            'byDepartmentCost' => $byDept,
            'byDealer' => $byDealer,
            'byStatus' => $byStatus,
            'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
            'senseExportUrl' => 'https://sense.vau.ee/hub/stream/claims-v3',
        ];
    }
}
