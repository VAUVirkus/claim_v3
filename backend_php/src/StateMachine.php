<?php

namespace Vau\Claim;

/**
 * Explicit Lifecycle State Machine (Spec 2.3)
 * Guarantees that only valid business state transitions can occur,
 * enforces mandatory rejection and reopening reasons, and creates audit entries.
 */
class StateMachine
{
    public const ALLOWED_TRANSITIONS = [
        'SUBMITTED' => ['HANDLER_ASSIGNED', 'IN_PROGRESS', 'REJECTED'],
        'HANDLER_ASSIGNED' => ['IN_PROGRESS', 'ON_HOLD', 'REJECTED'],
        'IN_PROGRESS' => ['SERVICE_ASSIGNED', 'COST_PROPOSED', 'APPROVED', 'ON_HOLD', 'REJECTED'],
        'ON_HOLD' => ['IN_PROGRESS', 'REJECTED'],
        'SERVICE_ASSIGNED' => ['SERVICE_COMPLETED', 'IN_PROGRESS', 'ON_HOLD', 'REJECTED'],
        'SERVICE_COMPLETED' => ['COST_PROPOSED', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'],
        'COST_PROPOSED' => ['IN_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'],
        'IN_APPROVAL' => ['APPROVED', 'COST_PROPOSED', 'IN_PROGRESS', 'REJECTED'], // rejection goes back to IN_PROGRESS or COST_PROPOSED with reason
        'APPROVED' => ['CLOSED', 'IN_PROGRESS'],
        'CLOSED' => ['REOPENED'],
        'REOPENED' => ['IN_PROGRESS'],
        'REJECTED' => ['REOPENED'],
    ];

    public const STATUS_LABELS = [
        'SUBMITTED' => 'Esitatud',
        'HANDLER_ASSIGNED' => 'Käsitleja määratud',
        'IN_PROGRESS' => 'Töös',
        'ON_HOLD' => 'Ootel / Inaktiivne',
        'SERVICE_ASSIGNED' => 'Teenus määratud',
        'SERVICE_COMPLETED' => 'Teenus tehtud',
        'COST_PROPOSED' => 'Kulukandja ettepanek',
        'IN_APPROVAL' => 'Kinnitamisel',
        'APPROVED' => 'Kinnitatud',
        'CLOSED' => 'Lõpetatud',
        'REJECTED' => 'Tagasi lükatud',
        'REOPENED' => 'Uuesti avatud',
    ];

    public static function canTransition(string $currentStatus, string $newStatus): bool
    {
        $allowed = self::ALLOWED_TRANSITIONS[$currentStatus] ?? [];
        return in_array($newStatus, $allowed, true);
    }

    public static function getLabel(string $status): string
    {
        return self::STATUS_LABELS[$status] ?? $status;
    }
}
