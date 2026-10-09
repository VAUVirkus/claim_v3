<?php

namespace Vau\Claim\Controllers;

use Vau\Claim\Database;
use Vau\Claim\Data;
use Vau\Claim\ClaimNumberGenerator;
use Vau\Claim\StateMachine;

class SyncController
{
    public static function sync(array $req): array
    {
        $items = $req['body']['items'] ?? [];
        $syncedResults = [];
        $db = Database::getInstance();
        $generator = new ClaimNumberGenerator();
        $dealers = Data::getDealers();

        foreach ($items as $item) {
            if (($item['action'] ?? '') === 'CREATE_CLAIM') {
                $dealerCode = $item['data']['dealerCode'] ?? '';
                $dealer = null;

                foreach ($dealers as $d) {
                    if (strcasecmp($d['code'], $dealerCode) === 0) {
                        $dealer = $d;
                        break;
                    }
                }

                if (!$dealer) {
                    $dealer = [
                        'code' => $dealerCode ?: 'UNKNOWN',
                        'name' => 'Edasimüüja (Offline)',
                        'country' => 'EST',
                    ];
                }

                $isTest = !empty($dealer['isTest']) || str_starts_with(strtoupper($dealerCode), 'TEST');
                $officialId = $generator->generate($isTest);
                $now = gmdate('Y-m-d\TH:i:s\Z');

                $claim = [
                    'id' => $officialId,
                    'status' => 'SUBMITTED',
                    'statusLabel' => StateMachine::getLabel('SUBMITTED'),
                    'isTest' => $isTest,
                    'createdAt' => $item['createdAt'] ?? $now,
                    'submittedLanguage' => $item['data']['language'] ?? 'et',
                    'offlineUuid' => $item['localId'] ?? null,
                    'dealer' => $dealer,
                    'product' => $item['data']['product'] ?? [],
                    'defect' => $item['data']['defect'] ?? [],
                    'endCustomer' => $item['data']['endCustomer'] ?? [],
                    'handlers' => [],
                    'service' => null,
                    'costProposals' => [],
                    'files' => array_map(function ($f, $i) use ($now) {
                        return [
                            'id' => 'f-off-' . time() . "-$i",
                            'name' => $f['name'] ?? 'Foto',
                            'size' => $f['size'] ?? '1.0 MB',
                            'tag' => $f['tag'] ?? 'Foto',
                            'uploadedAt' => $now,
                        ];
                    }, $item['data']['files'] ?? [], array_keys($item['data']['files'] ?? [])),
                    'notes' => [],
                    'timeline' => [
                        [
                            'id' => 't-' . time(),
                            'timestamp' => $now,
                            'actor' => "{$dealer['name']} (Võrguühenduseta)",
                            'event' => "Loodud võrguühenduseta (UUID: {$item['localId']}), sünkroonitud ametlikuks numbriks: $officialId",
                        ],
                    ],
                ];

                $db->saveClaim($claim);

                $syncedResults[] = [
                    'localId' => $item['localId'],
                    'assignedId' => $officialId,
                    'status' => 'SYNCED',
                ];
            }
        }

        return [
            'success' => true,
            'syncedCount' => count($syncedResults),
            'syncedResults' => $syncedResults,
        ];
    }
}
