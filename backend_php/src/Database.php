<?php

namespace Vau\Claim;

use PDO;
use PDOException;

/**
 * Database abstraction layer.
 * Uses SQLite by default for zero-setup local dev/prototyping and MariaDB/MySQL in production.
 * Ensures data persistence and query filtering.
 */
class Database
{
    private PDO $pdo;
    private static ?self $instance = null;

    public function __construct()
    {
        $storageDir = dirname(__DIR__) . '/storage';
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        $dbFile = $storageDir . '/claims.sqlite';
        $isNew = !file_exists($dbFile);

        $this->pdo = new PDO('sqlite:' . $dbFile, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $this->initSchema($isNew);
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getPdo(): PDO
    {
        return $this->pdo;
    }

    private function initSchema(bool $isNew): void
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS claims (
                id VARCHAR(32) PRIMARY KEY,
                status VARCHAR(64) NOT NULL,
                status_label VARCHAR(64) NOT NULL,
                is_test INTEGER NOT NULL DEFAULT 0,
                created_at VARCHAR(64) NOT NULL,
                submitted_language VARCHAR(8) NOT NULL DEFAULT 'et',
                dealer_code VARCHAR(32),
                product_name VARCHAR(255),
                order_number VARCHAR(128),
                defect_type VARCHAR(64),
                raw_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status);
            CREATE INDEX IF NOT EXISTS idx_claims_dealer ON claims (dealer_code);
            CREATE INDEX IF NOT EXISTS idx_claims_order ON claims (order_number);
        ");

        if ($isNew) {
            $this->seedInitialClaims();
        }
    }

    public function seedInitialClaims(): void
    {
        $initial = Data::getInitialClaims();
        $stmt = $this->pdo->prepare("
            INSERT OR REPLACE INTO claims (
                id, status, status_label, is_test, created_at, submitted_language,
                dealer_code, product_name, order_number, defect_type, raw_json
            ) VALUES (
                :id, :status, :status_label, :is_test, :created_at, :submitted_language,
                :dealer_code, :product_name, :order_number, :defect_type, :raw_json
            )
        ");

        foreach ($initial as $c) {
            $stmt->execute([
                ':id' => $c['id'],
                ':status' => $c['status'],
                ':status_label' => $c['statusLabel'],
                ':is_test' => $c['isTest'] ? 1 : 0,
                ':created_at' => $c['createdAt'],
                ':submitted_language' => $c['submittedLanguage'] ?? 'et',
                ':dealer_code' => $c['dealer']['code'] ?? null,
                ':product_name' => $c['product']['productName'] ?? null,
                ':order_number' => $c['product']['orderNumber'] ?? null,
                ':defect_type' => $c['defect']['type'] ?? null,
                ':raw_json' => json_encode($c, JSON_UNESCAPED_UNICODE),
            ]);
        }
    }

    public function getAllClaims(array $filters = []): array
    {
        $sql = "SELECT raw_json FROM claims WHERE 1=1";
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND status = :status";
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['dealerCode'])) {
            $sql .= " AND dealer_code = :dealer_code";
            $params[':dealer_code'] = $filters['dealerCode'];
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $claims = array_map(function ($r) {
            return json_decode($r['raw_json'], true);
        }, $rows);

        // Apply handlerId filter and search query filter in PHP memory for nested structure
        if (!empty($filters['handlerId'])) {
            $hid = $filters['handlerId'];
            $claims = array_filter($claims, function ($c) use ($hid) {
                $handlers = $c['handlers'] ?? [];
                foreach ($handlers as $h) {
                    if (($h['id'] ?? '') === $hid) {
                        return true;
                    }
                }
                return false;
            });
        }

        if (!empty($filters['search'])) {
            $q = mb_strtolower(trim($filters['search']));
            $claims = array_filter($claims, function ($c) use ($q) {
                // Wide scope search across all fields
                if (str_contains(mb_strtolower($c['id'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['dealer']['name'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['dealer']['code'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['dealer']['contactPerson'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['product']['productName'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['product']['orderNumber'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['product']['serialNumber'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['replacementOrderNumber'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['defect']['typeName'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['defect']['description'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['endCustomer']['name'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['endCustomer']['phone'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['endCustomer']['email'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['endCustomer']['address'] ?? ''), $q)) return true;
                if (str_contains(mb_strtolower($c['actionPlan']['description'] ?? ''), $q)) return true;
                
                // Check notes
                foreach ($c['notes'] ?? [] as $n) {
                    if (str_contains(mb_strtolower($n['content'] ?? ''), $q)) return true;
                    if (str_contains(mb_strtolower($n['author'] ?? ''), $q)) return true;
                }
                
                // Check invoices
                foreach ($c['invoices'] ?? [] as $inv) {
                    if (str_contains(mb_strtolower($inv['number'] ?? ''), $q)) return true;
                    if (str_contains(mb_strtolower($inv['type'] ?? ''), $q)) return true;
                }

                // Check emails
                foreach ($c['emails'] ?? [] as $em) {
                    if (str_contains(mb_strtolower($em['subject'] ?? ''), $q)) return true;
                    if (str_contains(mb_strtolower($em['body'] ?? ''), $q)) return true;
                }

                return false;
            });
        }

        $sortBy = $filters['sortBy'] ?? 'default';

        if ($sortBy === 'criticality') {
            // Rejected or rejected-from-approval are most critical, then in-approval, then submitted, then newest
            usort($claims, function ($a, $b) {
                $score = function ($c) {
                    if (($c['isCritical'] ?? false) || ($c['status'] ?? '') === 'REJECTED' || ($c['progressFlag'] ?? '') === 'REJECTED_NEEDS_REVISION') {
                        return 100;
                    }
                    if (($c['status'] ?? '') === 'IN_APPROVAL') return 80;
                    if (($c['status'] ?? '') === 'SUBMITTED') return 60;
                    if (($c['status'] ?? '') === 'IN_PROGRESS') return 40;
                    if (($c['status'] ?? '') === 'ON_HOLD') return 20;
                    return 10;
                };
                $diff = $score($b) - $score($a);
                if ($diff !== 0) return $diff;
                return strcmp($b['updatedAt'] ?? $b['createdAt'] ?? '', $a['updatedAt'] ?? $a['createdAt'] ?? '');
            });
        } elseif ($sortBy === 'updatedAt') {
            usort($claims, function ($a, $b) {
                $timeA = $a['updatedAt'] ?? $a['createdAt'] ?? '';
                $timeB = $b['updatedAt'] ?? $b['createdAt'] ?? '';
                return strcmp($timeB, $timeA);
            });
        } elseif ($sortBy === 'oldest') {
            usort($claims, function ($a, $b) {
                return strcmp($a['createdAt'] ?? '', $b['createdAt'] ?? '');
            });
        } elseif ($sortBy === 'id') {
            usort($claims, function ($a, $b) {
                return strcmp($b['id'] ?? '', $a['id'] ?? '');
            });
        } else {
            // Default: newest first
            usort($claims, function ($a, $b) {
                return strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? '');
            });
        }

        return array_values($claims);
    }

    public function getClaimById(string $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT raw_json FROM claims WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return json_decode($row['raw_json'], true);
    }

    public function saveClaim(array $claim): void
    {
        $stmt = $this->pdo->prepare("
            INSERT OR REPLACE INTO claims (
                id, status, status_label, is_test, created_at, submitted_language,
                dealer_code, product_name, order_number, defect_type, raw_json
            ) VALUES (
                :id, :status, :status_label, :is_test, :created_at, :submitted_language,
                :dealer_code, :product_name, :order_number, :defect_type, :raw_json
            )
        ");

        $stmt->execute([
            ':id' => $claim['id'],
            ':status' => $claim['status'],
            ':status_label' => $claim['statusLabel'] ?? StateMachine::getLabel($claim['status']),
            ':is_test' => !empty($claim['isTest']) ? 1 : 0,
            ':created_at' => $claim['createdAt'],
            ':submitted_language' => $claim['submittedLanguage'] ?? 'et',
            ':dealer_code' => $claim['dealer']['code'] ?? null,
            ':product_name' => $claim['product']['productName'] ?? null,
            ':order_number' => $claim['product']['orderNumber'] ?? null,
            ':defect_type' => $claim['defect']['type'] ?? null,
            ':raw_json' => json_encode($claim, JSON_UNESCAPED_UNICODE),
        ]);
    }
}
