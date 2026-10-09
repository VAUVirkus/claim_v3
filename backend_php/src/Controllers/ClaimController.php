<?php

namespace Vau\Claim\Controllers;

use Vau\Claim\Database;
use Vau\Claim\Data;
use Vau\Claim\ClaimNumberGenerator;
use Vau\Claim\StateMachine;

class ClaimController
{
    public static function index(array $req): array
    {
        $db = Database::getInstance();
        $claims = $db->getAllClaims($req['query'] ?? []);

        return [
            'total' => count($claims),
            'claims' => $claims,
        ];
    }

    public static function show(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        return $claim;
    }

    public static function create(array $req): array
    {
        $body = $req['body'] ?? [];
        $dealerCode = trim($body['dealerCode'] ?? '');
        $product = $body['product'] ?? [];
        $defect = $body['defect'] ?? [];
        $endCustomer = $body['endCustomer'] ?? [];
        $files = $body['files'] ?? [];
        $language = $body['language'] ?? 'et';
        $offlineUuid = $body['offlineUuid'] ?? null;

        $dealers = Data::getDealers();
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
                'name' => 'Määramata edasimüüja',
                'country' => 'EST',
            ];
        }

        if (!empty($body['dealerOverrides'])) {
            $dealer = array_merge($dealer, $body['dealerOverrides']);
        }

        $isTest = !empty($dealer['isTest']) || str_starts_with(strtoupper($dealerCode), 'TEST');
        
        $generator = new ClaimNumberGenerator();
        $claimId = $generator->generate($isTest);

        $defectTypes = Data::getDefectTypes();
        $typeName = 'Muu defekt';
        foreach ($defectTypes as $dt) {
            if ($dt['id'] === ($defect['type'] ?? '')) {
                $typeName = $dt['name'];
                break;
            }
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');

        $claim = [
            'id' => $claimId,
            'status' => 'SUBMITTED',
            'statusLabel' => StateMachine::getLabel('SUBMITTED'),
            'isTest' => $isTest,
            'createdAt' => $now,
            'submittedLanguage' => $language,
            'offlineUuid' => $offlineUuid,
            'dealer' => $dealer,
            'product' => [
                'category' => $product['category'] ?? 'windows',
                'subcategory' => $product['subcategory'] ?? '',
                'productName' => $product['productName'] ?? 'Nimetu toode',
                'orderNumber' => $product['orderNumber'] ?? '',
                'serialNumber' => $product['serialNumber'] ?? '',
                'quantity' => (int)($product['quantity'] ?? 1),
                'dimensions' => $product['dimensions'] ?? '',
                'isInstalled' => !empty($product['isInstalled']),
            ],
            'defect' => [
                'type' => $defect['type'] ?? 'other',
                'typeName' => $typeName,
                'description' => $defect['description'] ?? '',
            ],
            'endCustomer' => [
                'name' => $endCustomer['name'] ?? '',
                'phone' => $endCustomer['phone'] ?? '',
                'email' => $endCustomer['email'] ?? '',
                'address' => $endCustomer['address'] ?? '',
                'onSiteInspectionNeeded' => !empty($endCustomer['onSiteInspectionNeeded']),
            ],
            'handlers' => [],
            'service' => null,
            'costProposals' => [],
            'files' => array_map(function ($f, $i) use ($now) {
                return [
                    'id' => 'f-' . time() . "-$i",
                    'name' => $f['name'] ?? 'Pilt',
                    'size' => $f['size'] ?? '1.2 MB',
                    'tag' => $f['tag'] ?? 'Foto',
                    'uploadedAt' => $now,
                ];
            }, $files, array_keys($files)),
            'notes' => [],
            'timeline' => [
                [
                    'id' => 't-' . time(),
                    'timestamp' => $now,
                    'actor' => $dealer['name'] ?? 'Edasimüüja',
                    'event' => "Reklamatsioon esitatud veebivormi kaudu ($claimId)",
                ],
            ],
        ];

        Database::getInstance()->saveClaim($claim);
        http_response_code(201);

        return [
            'success' => true,
            'claimId' => $claimId,
            'claim' => $claim,
        ];
    }

    public static function updateStatus(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $newStatus = $body['status'] ?? '';
        $reason = trim($body['reason'] ?? '');
        $actor = $body['actor'] ?? 'Käsitleja';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $currentStatus = $claim['status'];

        if (!StateMachine::canTransition($currentStatus, $newStatus)) {
            http_response_code(400);
            return [
                'error' => "Keelatud olekuüleminek: '$currentStatus' -> '$newStatus'. Vaata reegleid spec_v3 ptk 2.3.",
            ];
        }

        // Rule 2.3: Mandatory reasons
        if ($newStatus === 'REJECTED' && empty($reason)) {
            http_response_code(400);
            return ['error' => 'Reklamatsiooni tagasilükkamisel on põhjendus KOHUSTUSLIK (Raudreegel 2.3)!'];
        }

        if ($newStatus === 'REOPENED' && empty($reason)) {
            http_response_code(400);
            return ['error' => 'Reklamatsiooni uuesti avamisel on põhjendus KOHUSTUSLIK (Raudreegel 2.3)!'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['status'] = $newStatus;
        $claim['statusLabel'] = StateMachine::getLabel($newStatus);

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $actor,
            'event' => "Staatus muudetud: " . StateMachine::getLabel($currentStatus) . " → " . StateMachine::getLabel($newStatus) . ($reason ? " (Põhjus: $reason)" : ""),
        ];

        if ($reason) {
            $claim['notes'][] = [
                'id' => 'n-' . time(),
                'type' => $newStatus === 'REJECTED' ? 'REJECTION' : 'HANDLER',
                'typeLabel' => $newStatus === 'REJECTED' ? 'Tagasilükkamise põhjus' : 'Uuesti avamise põhjus',
                'author' => $actor,
                'createdAt' => $now,
                'content' => $reason,
            ];
        }

        $db->saveClaim($claim);

        return [
            'success' => true,
            'claim' => $claim,
        ];
    }

    public static function addNote(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $type = $body['type'] ?? 'INFO';
        $content = trim($body['content'] ?? '');
        $author = $body['author'] ?? 'Käsitleja';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $validTypes = [
            'INFO' => 'Lisainfo',
            'HANDLER' => 'Käsitleja märge',
            'SERVICE' => 'Teenuse märge',
            'REJECTION' => 'Tagasilükkamise põhjus',
        ];

        if (!isset($validTypes[$type])) {
            http_response_code(400);
            return ['error' => 'Vigane märkme tüüp. Lubatud: ' . implode(', ', array_keys($validTypes))];
        }

        if (empty($content)) {
            http_response_code(400);
            return ['error' => 'Märkme sisu ei tohi olla tühi.'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $note = [
            'id' => 'n-' . time(),
            'type' => $type,
            'typeLabel' => $validTypes[$type],
            'author' => $author,
            'createdAt' => $now,
            'content' => $content,
        ];

        $claim['notes'][] = $note;
        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $author,
            'event' => "Lisatud märge [{$validTypes[$type]}]",
        ];

        $db->saveClaim($claim);

        return [
            'success' => true,
            'note' => $note,
            'claim' => $claim,
        ];
    }

    public static function assignHandlers(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $handlerIds = $body['handlerIds'] ?? [];

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $allHandlers = Data::getHandlers();
        $selected = array_values(array_filter($allHandlers, function ($h) use ($handlerIds) {
            return in_array($h['id'], $handlerIds, true);
        }));

        if (empty($selected)) {
            http_response_code(400);
            return ['error' => 'Vähemalt üks käsitleja peab olema määratud (Raudreegel 3.1).'];
        }

        $claim['handlers'] = $selected;
        $now = gmdate('Y-m-d\TH:i:s\Z');

        if ($claim['status'] === 'SUBMITTED') {
            $claim['status'] = 'HANDLER_ASSIGNED';
            $claim['statusLabel'] = StateMachine::getLabel('HANDLER_ASSIGNED');
        }

        $names = implode(', ', array_column($selected, 'name'));
        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => 'Süsteem',
            'event' => "Käsitlejateks määratud: $names",
        ];

        $db->saveClaim($claim);

        return [
            'success' => true,
            'claim' => $claim,
        ];
    }

    public static function assignService(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $teamId = $body['teamId'] ?? '';
        $scheduledDate = $body['scheduledDate'] ?? '';
        $notes = $body['notes'] ?? '';
        $action = $body['action'] ?? '';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');

        if ($action === 'COMPLETE') {
            if (empty($claim['service'])) {
                http_response_code(400);
                return ['error' => 'Teenust pole määratud.'];
            }

            $claim['service']['status'] = 'COMPLETED';
            $claim['service']['completionNotes'] = $notes ?: 'Töö lõpetatud.';
            $claim['service']['completedAt'] = $now;
            $claim['status'] = 'SERVICE_COMPLETED';
            $claim['statusLabel'] = StateMachine::getLabel('SERVICE_COMPLETED');

            $teamName = $claim['service']['teamName'] ?? 'Teenusmeeskond';
            $claim['timeline'][] = [
                'id' => 't-' . time(),
                'timestamp' => $now,
                'actor' => $teamName,
                'event' => 'Teenustöö objektil märgitud TEHTUKS',
            ];

            $db->saveClaim($claim);
            return ['success' => true, 'claim' => $claim];
        }

        $teams = Data::getServiceTeams();
        $team = null;
        foreach ($teams as $t) {
            if ($t['id'] === $teamId) {
                $team = $t;
                break;
            }
        }

        if (!$team) {
            http_response_code(400);
            return ['error' => 'Valitud teenusmeeskonda ei leitud.'];
        }

        $claim['service'] = [
            'teamId' => $team['id'],
            'teamName' => $team['name'],
            'scheduledDate' => $scheduledDate,
            'status' => 'SCHEDULED',
            'notes' => $notes,
        ];

        if (in_array($claim['status'], ['IN_PROGRESS', 'HANDLER_ASSIGNED'], true)) {
            $claim['status'] = 'SERVICE_ASSIGNED';
            $claim['statusLabel'] = StateMachine::getLabel('SERVICE_ASSIGNED');
        }

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => 'Käsitleja',
            'event' => "Teenus määratud meeskonnale '{$team['name']}' kuupäevaks $scheduledDate",
        ];

        $db->saveClaim($claim);

        return ['success' => true, 'claim' => $claim];
    }

    public static function submitCostProposal(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $totalAmountEur = (float)($body['totalAmountEur'] ?? 0);
        $splits = $body['splits'] ?? [];
        $proposedBy = $body['proposedBy'] ?? 'Mari Maasikas';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $sumPercent = array_sum(array_column($splits, 'percentage'));

        if ((int)$sumPercent !== 100) {
            http_response_code(400);
            return [
                'error' => "Kulujaotuse osade summa peab olema täpselt 100%! Praegune summa: {$sumPercent}%",
            ];
        }

        $costAccounts = Data::getCostAccounts();
        $accountsMap = array_column($costAccounts, 'name', 'id');

        $proposal = [
            'id' => 'cp-' . time(),
            'totalAmountEur' => $totalAmountEur,
            'splits' => array_map(function ($s) use ($totalAmountEur, $accountsMap) {
                $pct = (float)($s['percentage'] ?? 0);
                return [
                    'accountId' => $s['accountId'],
                    'accountName' => $accountsMap[$s['accountId']] ?? $s['accountId'],
                    'percentage' => $pct,
                    'amountEur' => ($totalAmountEur * $pct) / 100,
                ];
            }, $splits),
            'proposedBy' => $proposedBy,
            'proposedAt' => gmdate('Y-m-d\TH:i:s\Z'),
            'status' => 'PENDING_APPROVAL',
        ];

        $claim['costProposals'][] = $proposal;
        $claim['status'] = 'IN_APPROVAL';
        $claim['statusLabel'] = StateMachine::getLabel('IN_APPROVAL');

        $splitStrings = array_map(fn($s) => "{$s['percentage']}%", $splits);
        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'actor' => $proposedBy,
            'event' => "Esitatud kulupakkumine summas {$totalAmountEur} € (" . implode(' / ', $splitStrings) . ")",
        ];

        $db->saveClaim($claim);

        return [
            'success' => true,
            'proposal' => $proposal,
            'claim' => $claim,
        ];
    }

    public static function approveCostProposal(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $propId = $req['params']['propId'] ?? '';
        $body = $req['body'] ?? [];
        $approved = !empty($body['approved']);
        $rejectionReason = trim($body['rejectionReason'] ?? '');
        $approver = $body['approver'] ?? 'Tootmisjuht';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $propIndex = null;
        foreach ($claim['costProposals'] as $idx => $p) {
            if ($p['id'] === $propId) {
                $propIndex = $idx;
                break;
            }
        }

        if ($propIndex === null) {
            http_response_code(404);
            return ['error' => 'Cost proposal not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $proposal = &$claim['costProposals'][$propIndex];

        if ($approved) {
            $proposal['status'] = 'APPROVED';
            $proposal['approvedBy'] = $approver;
            $proposal['approvedAt'] = $now;

            $claim['status'] = 'APPROVED';
            $claim['statusLabel'] = StateMachine::getLabel('APPROVED');

            $claim['timeline'][] = [
                'id' => 't-' . time(),
                'timestamp' => $now,
                'actor' => $approver,
                'event' => "Kulupakkumine KINNITATUD ({$proposal['totalAmountEur']} €)",
            ];
        } else {
            if (empty($rejectionReason) || strlen($rejectionReason) < 5) {
                http_response_code(400);
                return ['error' => 'Kulupakkumise tagasilükkamisel on põhjendus kohustuslik!'];
            }

            $proposal['status'] = 'REJECTED';
            $proposal['rejectionReason'] = $rejectionReason;
            $proposal['rejectedBy'] = $approver;
            $proposal['rejectedAt'] = $now;

            $claim['status'] = 'COST_PROPOSED';
            $claim['statusLabel'] = StateMachine::getLabel('COST_PROPOSED');

            $claim['timeline'][] = [
                'id' => 't-' . time(),
                'timestamp' => $now,
                'actor' => $approver,
                'event' => "Kulupakkumine TAGASI LÜKATUD: $rejectionReason",
            ];

            $claim['notes'][] = [
                'id' => 'n-' . time(),
                'type' => 'REJECTION',
                'typeLabel' => 'Tagasilükkamise põhjus',
                'author' => $approver,
                'createdAt' => $now,
                'content' => "Kulupakkumise tagasilükkamine: $rejectionReason",
            ];
        }

        $db->saveClaim($claim);

        return [
            'success' => true,
            'proposal' => $proposal,
            'claim' => $claim,
        ];
    }

    public static function updateActionPlan(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $description = trim($body['description'] ?? '');
        $deadline = $body['deadline'] ?? null;
        $assignee = $body['assignee'] ?? 'Käsitleja';
        $status = $body['status'] ?? 'IN_PROGRESS';
        $rejectionReason = trim($body['rejectionReason'] ?? '');
        $actor = $body['actor'] ?? 'Käsitleja';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['updatedAt'] = $now;

        $claim['actionPlan'] = [
            'description' => $description,
            'deadline' => $deadline,
            'assignee' => $assignee,
            'status' => $status,
            'rejectionReason' => $rejectionReason ?: null,
            'updatedAt' => $now,
        ];

        if ($status === 'REJECTED') {
            if (empty($rejectionReason)) {
                http_response_code(400);
                return ['error' => 'Tegevusplaani tagasilükkamisel on põhjendus kohustuslik!'];
            }
            $claim['isCritical'] = true;
            $claim['progressFlag'] = 'REJECTED_NEEDS_REVISION';
            $claim['progressFlagLabel'] = '⚠️ Kinnitamiselt tagasi lükatud (Tegevuskava)';
            
            $claim['timeline'][] = [
                'id' => 't-' . time(),
                'timestamp' => $now,
                'actor' => $actor,
                'event' => "Tegevusplaan TAGASI LÜKATUD: $rejectionReason",
            ];

            $claim['notes'][] = [
                'id' => 'n-' . time(),
                'type' => 'REJECTION',
                'typeLabel' => 'Tagasilükkamise põhjus',
                'author' => $actor,
                'createdAt' => $now,
                'content' => "Tegevusplaani tagasilükkamine: $rejectionReason",
            ];
        } else {
            $claim['timeline'][] = [
                'id' => 't-' . time(),
                'timestamp' => $now,
                'actor' => $actor,
                'event' => "Tegevusplaan uuendatud (Tähtaeg: " . ($deadline ?: 'määramata') . ")",
            ];
        }

        $db->saveClaim($claim);

        return ['success' => true, 'claim' => $claim];
    }

    public static function updateReplacementOrder(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $orderNumber = trim($body['replacementOrderNumber'] ?? '');
        $actor = $body['actor'] ?? 'Käsitleja';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['updatedAt'] = $now;
        $claim['replacementOrderNumber'] = $orderNumber;

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $actor,
            'event' => "Asendustellimuse number määratud: " . ($orderNumber ?: 'Eemaldatud'),
        ];

        $db->saveClaim($claim);

        return ['success' => true, 'claim' => $claim];
    }

    public static function addInvoice(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $number = trim($body['number'] ?? '');
        $amountEur = (float)($body['amountEur'] ?? 0);
        $type = $body['type'] ?? 'Töö arve';
        $fileName = $body['fileName'] ?? '';
        $actor = $body['actor'] ?? 'Käsitleja / Raamatupidamine';

        if (empty($number)) {
            http_response_code(400);
            return ['error' => 'Arve number on kohustuslik'];
        }

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['updatedAt'] = $now;

        $invoice = [
            'id' => 'inv-' . time(),
            'number' => $number,
            'date' => $body['date'] ?? gmdate('Y-m-d'),
            'amountEur' => $amountEur,
            'type' => $type,
            'fileName' => $fileName,
            'createdAt' => $now,
        ];

        $claim['invoices'] = $claim['invoices'] ?? [];
        $claim['invoices'][] = $invoice;

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $actor,
            'event' => "Lisatud arve $number ($type, {$amountEur} €)",
        ];

        $db->saveClaim($claim);

        return ['success' => true, 'invoice' => $invoice, 'claim' => $claim];
    }

    public static function addFile(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $name = trim($body['name'] ?? '');
        $tag = $body['tag'] ?? 'Defekti lähivõte';
        $size = $body['size'] ?? '1.5 MB';
        $fileType = $body['type'] ?? 'image';
        $actor = $body['actor'] ?? 'Käsitleja';

        if (empty($name)) {
            http_response_code(400);
            return ['error' => 'Faili nimi on kohustuslik'];
        }

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['updatedAt'] = $now;

        $fileItem = [
            'id' => 'f-' . time() . '-' . rand(10, 99),
            'name' => $name,
            'size' => $size,
            'type' => $fileType,
            'tag' => $tag,
            'uploadedAt' => $now,
        ];

        $claim['files'] = $claim['files'] ?? [];
        $claim['files'][] = $fileItem;

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $actor,
            'event' => "Lisatud fail: $name ($tag)",
        ];

        $db->saveClaim($claim);

        return ['success' => true, 'file' => $fileItem, 'claim' => $claim];
    }

    public static function addEmail(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $from = trim($body['from'] ?? '');
        $to = trim($body['to'] ?? '');
        $subject = trim($body['subject'] ?? '');
        $bodyText = trim($body['body'] ?? '');
        $actor = $body['actor'] ?? 'Käsitleja';

        if (empty($subject) || empty($bodyText)) {
            http_response_code(400);
            return ['error' => 'Teema ja kirja sisu on kohustuslikud'];
        }

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['updatedAt'] = $now;

        $emailItem = [
            'id' => 'em-' . time(),
            'from' => $from ?: 'reklamatsioonid@vau.ee',
            'to' => $to ?: ($claim['dealer']['email'] ?? 'klient@vau.ee'),
            'date' => $now,
            'subject' => $subject,
            'body' => $bodyText,
        ];

        $claim['emails'] = $claim['emails'] ?? [];
        $claim['emails'][] = $emailItem;

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $actor,
            'event' => "Saadetud e-kiri teemal: $subject",
        ];

        $db->saveClaim($claim);

        return ['success' => true, 'email' => $emailItem, 'claim' => $claim];
    }

    public static function updateDefectType(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $defectTypeId = trim($body['defectTypeId'] ?? '');
        $actor = $body['actor'] ?? 'Kinnitaja';

        $defectTypes = Data::getDefectTypes();
        $defectName = null;
        foreach ($defectTypes as $dt) {
            if ($dt['id'] === $defectTypeId) {
                $defectName = $dt['name'];
                break;
            }
        }

        if (!$defectName) {
            $defectName = $body['defectTypeName'] ?? $defectTypeId;
        }

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['updatedAt'] = $now;
        $oldName = $claim['defect']['typeName'] ?? $claim['defect']['type'];

        $claim['defect']['type'] = $defectTypeId;
        $claim['defect']['typeName'] = $defectName;

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $actor,
            'event' => "Veatüüp muudetud: $oldName → $defectName",
        ];

        $db->saveClaim($claim);

        return ['success' => true, 'claim' => $claim];
    }

    public static function updateCostAllocations(array $req): array
    {
        $id = $req['params']['id'] ?? '';
        $body = $req['body'] ?? [];
        $allocations = $body['allocations'] ?? [];
        $actor = $body['actor'] ?? 'Käsitleja';

        $db = Database::getInstance();
        $claim = $db->getClaimById($id);

        if (!$claim) {
            http_response_code(404);
            return ['error' => 'Claim not found'];
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $claim['updatedAt'] = $now;
        $claim['costAllocations'] = $allocations;

        $totalSum = array_sum(array_column($allocations, 'amountEur'));
        $deptNames = array_map(fn($a) => ($a['departmentName'] ?? $a['departmentId']) . " ({$a['percentage']}%)", $allocations);

        $claim['timeline'][] = [
            'id' => 't-' . time(),
            'timestamp' => $now,
            'actor' => $actor,
            'event' => "Kulukandjate jaotus salvestatud (Summa {$totalSum} €): " . implode(' + ', $deptNames),
        ];

        $db->saveClaim($claim);

        return ['success' => true, 'claim' => $claim];
    }

    public static function reseed(array $req): array
    {
        $db = Database::getInstance();
        $db->seedInitialClaims();
        return ['success' => true, 'message' => 'Algandmed uuesti laaditud SQLite andmebaasi.'];
    }
}
