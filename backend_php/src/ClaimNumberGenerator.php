<?php

namespace Vau\Claim;

/**
 * Atomic Claim Number Generator (Spec 2.1, 2.4, 3.1)
 * Generates human-readable IDs in format P + 5 digits (production) or T + 5 digits (test).
 * Thread-safe using file locking to prevent collisions and overflows.
 */
class ClaimNumberGenerator
{
    private string $lockFile;
    private string $dataFile;

    public function __construct(?string $storageDir = null)
    {
        $dir = $storageDir ?? dirname(__DIR__) . '/storage';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $this->lockFile = $dir . '/sequence.lock';
        $this->dataFile = $dir . '/sequence.json';

        if (!file_exists($this->dataFile)) {
            file_put_contents($this->dataFile, json_encode([
                'pSequence' => 2542, // next P sequence (after seeded P02540, P02541)
                'tSequence' => 2,    // next T sequence (after seeded T00001)
            ], JSON_PRETTY_PRINT));
        }
    }

    public function generate(bool $isTest = false): string
    {
        $fp = fopen($this->lockFile, 'c+');
        if (!$fp) {
            throw new \RuntimeException('Cannot open lock file for claim number generation');
        }

        // Acquire exclusive blocking lock (Raudreegel 2: atomaarne lukustusega generaator)
        flock($fp, LOCK_EX);

        try {
            $raw = file_get_contents($this->dataFile);
            $seq = json_decode($raw, true) ?? ['pSequence' => 2542, 'tSequence' => 2];

            if ($isTest) {
                $num = $seq['tSequence'];
                $seq['tSequence'] += 1;
                $claimId = sprintf('T%05d', $num);
            } else {
                $num = $seq['pSequence'];
                $seq['pSequence'] += 1;
                $claimId = sprintf('P%05d', $num);
            }

            file_put_contents($this->dataFile, json_encode($seq, JSON_PRETTY_PRINT));

            return $claimId;
        } finally {
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }
}
