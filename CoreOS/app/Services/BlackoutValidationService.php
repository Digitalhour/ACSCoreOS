<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Holiday;
use App\Models\Position;
use App\Models\PtoModels\PtoBlackout;
use App\Models\PtoModels\PtoRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class BlackoutValidationService
{
    /**
     * Validate and store blackout information for a PTO request
     */
    public function validateAndStorePtoRequest(PtoRequest $ptoRequest, bool $isEmergency = false): array
    {
        $user = $ptoRequest->user;
        $validation = $this->validatePtoRequest(
            $user,
            $ptoRequest->start_date->format('Y-m-d'),
            $ptoRequest->end_date->format('Y-m-d'),
            $ptoRequest->pto_type_id,
            $isEmergency
        );

        // Store blackout validation results
        $ptoRequest->storeBlackoutValidation($validation);

        // Handle emergency override request
        if ($isEmergency && $validation['has_conflicts']) {
            $ptoRequest->requestEmergencyOverride('Emergency PTO request with blackout conflicts');
        }

        return $validation;
    }

    /**
     * Process blackout acknowledgment
     */
    public function processBlackoutAcknowledgment(PtoRequest $ptoRequest, User $user): bool
    {
        if (! $ptoRequest->hasBlackoutWarnings()) {
            return true; // No warnings to acknowledge
        }

        $ptoRequest->acknowledgeBlackoutWarnings($user);

        return true;
    }

    /**
     * Process emergency override approval
     */
    public function processEmergencyOverrideApproval(PtoRequest $ptoRequest, User $approver, bool $approved, ?string $reason = null): array
    {
        if (! $ptoRequest->hasEmergencyOverride()) {
            return [
                'success' => false,
                'message' => 'No emergency override requested for this PTO request.',
            ];
        }

        if ($approved) {
            $ptoRequest->approveEmergencyOverride($approver);

            // Update request status if it was previously denied due to blackout
            if ($ptoRequest->isDenied() && $this->wasDeniedForBlackout($ptoRequest)) {
                $ptoRequest->update([
                    'status' => 'pending',
                    'denied_at' => null,
                    'denial_reason' => null,
                ]);
            }

            return [
                'success' => true,
                'message' => 'Emergency override approved. PTO request can now proceed through normal approval process.',
            ];
        } else {
            $ptoRequest->update([
                'is_emergency_override' => false,
                'blackout_override_reason' => null,
                'status' => 'denied',
                'denied_at' => now(),
                'denial_reason' => $reason ?? 'Emergency override denied due to blackout conflicts.',
            ]);

            return [
                'success' => true,
                'message' => 'Emergency override denied. PTO request has been rejected.',
            ];
        }
    }

    /**
     * Validate if a PTO request conflicts with any blackout periods
     */
    public function validatePtoRequest(User $user, string $startDate, string $endDate, int $ptoTypeId, bool $isEmergency = false): array
    {
        $conflicts = [];
        $warnings = [];

        // Get active regular blackouts that overlap with the requested dates
        $regularBlackouts = PtoBlackout::active()
            ->where('is_recurring', false)
            ->overlapping($startDate, $endDate)
            ->get();

        // Get active recurring blackouts that might apply to any day in the range
        $recurringBlackouts = PtoBlackout::active()
            ->where('is_recurring', true)
            ->get()
            ->filter(function ($blackout) use ($startDate, $endDate) {
                return $blackout->overlapsWithRecurringDays($startDate, $endDate);
            });

        // Combine both types of blackouts
        $allBlackouts = $regularBlackouts->merge($recurringBlackouts);

        foreach ($allBlackouts as $blackout) {
            // Check if blackout applies to this user
            if (! $this->blackoutAppliesToUser($blackout, $user)) {
                continue;
            }

            // Check if PTO type is restricted by this blackout
            if (! $this->ptoTypeIsRestricted($blackout, $ptoTypeId)) {
                continue;
            }

            // Check if dates overlap with holidays (if blackout excludes holidays)
            if ($blackout->is_holiday && $this->requestOverlapsWithHolidays($startDate, $endDate)) {
                continue;
            }

            // For recurring blackouts, we need special handling
            if ($blackout->is_recurring) {
                $result = $this->processRecurringBlackout($blackout, $user, $startDate, $endDate, $ptoTypeId, $isEmergency);
            } else {
                // Process the blackout based on the restriction type
                $result = $this->processBlackoutRestriction($blackout, $user, $startDate, $endDate, $ptoTypeId, $isEmergency);
            }

            if ($result['type'] === 'conflict') {
                $conflicts[] = $result;
            } elseif ($result['type'] === 'warning') {
                $warnings[] = $result;
            }
        }

        return [
            'has_conflicts' => ! empty($conflicts),
            'has_warnings' => ! empty($warnings),
            'conflicts' => $conflicts,
            'warnings' => $warnings,
            'can_submit' => empty($conflicts),
            'requires_acknowledgment' => ! empty($warnings),
            'requires_override' => ! empty($conflicts) && $isEmergency,
        ];
    }

    /**
     * Process recurring blackout restrictions
     */
    private function processRecurringBlackout(PtoBlackout $blackout, User $user, string $startDate, string $endDate, int $ptoTypeId, bool $isEmergency): array
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        $conflictingDays = [];

        // Find which specific days in the range conflict with the recurring blackout
        $current = $start->copy();
        while ($current->lte($end)) {
            if ($blackout->conflictsWithDate($current->format('Y-m-d'))) {
                $conflictingDays[] = $current->format('l, M d'); // e.g., "Friday, Jan 15"
            }
            $current->addDay();
        }

        if (empty($conflictingDays)) {
            return ['type' => 'none'];
        }

        $daysList = implode(', ', $conflictingDays);
        $recurringDayNames = implode(', ', $blackout->getRecurringDayNames());

        switch ($blackout->restriction_type) {
            case 'full_block':
                if ($isEmergency && $blackout->allow_emergency_override) {
                    return [
                        'type' => 'warning',
                        'blackout' => $blackout,
                        'message' => "Emergency override applied for recurring blackout on {$daysList} ({$blackout->name})",
                        'can_override' => true,
                        'conflicting_days' => $conflictingDays,
                        'restriction_details' => [
                            'type' => 'recurring_emergency_override',
                            'recurring_days' => $recurringDayNames,
                            'conflicting_dates' => $daysList,
                            'requires_approval' => true,
                        ],
                    ];
                }

                return [
                    'type' => 'conflict',
                    'blackout' => $blackout,
                    'message' => "PTO requests are blocked on {$recurringDayNames}. Your request includes: {$daysList} ({$blackout->name})",
                    'can_override' => $blackout->allow_emergency_override,
                    'conflicting_days' => $conflictingDays,
                    'restriction_details' => [
                        'type' => 'recurring_full_block',
                        'recurring_days' => $recurringDayNames,
                        'conflicting_dates' => $daysList,
                        'strict' => $blackout->is_strict,
                    ],
                ];

            case 'limit_requests':
                // For recurring limit requests, we need to count existing requests on these days
                return $this->processRecurringLimitRequests($blackout, $user, $conflictingDays, $recurringDayNames, $ptoTypeId);

            case 'warning_only':
                return [
                    'type' => 'warning',
                    'blackout' => $blackout,
                    'message' => "Note: Your request includes {$recurringDayNames} which are restricted for {$blackout->name}. Affected dates: {$daysList}",
                    'conflicting_days' => $conflictingDays,
                    'restriction_details' => [
                        'type' => 'recurring_advisory',
                        'recurring_days' => $recurringDayNames,
                        'conflicting_dates' => $daysList,
                    ],
                ];

            default:
                return $this->processFullBlock($blackout, $isEmergency);
        }
    }

    /**
     * Check if a request was denied specifically for blackout reasons
     */
    private function wasDeniedForBlackout(PtoRequest $ptoRequest): bool
    {
        if (! $ptoRequest->isDenied() || empty($ptoRequest->denial_reason)) {
            return false;
        }

        return str_contains(strtolower($ptoRequest->denial_reason), 'blackout') ||
            str_contains(strtolower($ptoRequest->denial_reason), 'restricted period');
    }

    /**
     * Get blackout status summary for a PTO request
     */
    public function getBlackoutStatusSummary(PtoRequest $ptoRequest): array
    {
        return [
            'has_conflicts' => $ptoRequest->hasBlackoutConflicts(),
            'has_warnings' => $ptoRequest->hasBlackoutWarnings(),
            'warnings_acknowledged' => $ptoRequest->areBlackoutWarningsAcknowledged(),
            'has_emergency_override' => $ptoRequest->hasEmergencyOverride(),
            'override_approved' => $ptoRequest->isOverrideApproved(),
            'conflicts_summary' => $ptoRequest->getFormattedBlackoutConflicts(),
            'warnings_summary' => $ptoRequest->getFormattedBlackoutWarnings(),
            'can_proceed' => $this->canRequestProceed($ptoRequest),
        ];
    }

    /**
     * Determine if a PTO request can proceed based on blackout status
     */
    private function canRequestProceed(PtoRequest $ptoRequest): bool
    {
        // No blackout issues
        if (! $ptoRequest->hasBlackoutConflicts() && ! $ptoRequest->hasBlackoutWarnings()) {
            return true;
        }

        // Has warnings but they are acknowledged
        if ($ptoRequest->hasBlackoutWarnings() && ! $ptoRequest->hasBlackoutConflicts()) {
            return $ptoRequest->areBlackoutWarningsAcknowledged();
        }

        // Has conflicts but emergency override is approved
        if ($ptoRequest->hasBlackoutConflicts() && $ptoRequest->hasEmergencyOverride()) {
            return $ptoRequest->isOverrideApproved();
        }

        // Has conflicts but no approved override
        return false;
    }

    /**
     * Get detailed blackout information for admin review interface
     */
    public function getBlackoutDetailsForAdmin(PtoRequest $ptoRequest): array
    {
        $user = $ptoRequest->user;
        $validation = $this->validatePtoRequest(
            $user,
            $ptoRequest->start_date,
            $ptoRequest->end_date,
            $ptoRequest->pto_type_id
        );

        $adminDetails = [
            'request_id' => $ptoRequest->id,
            'employee' => [
                'name' => $user->name,
                'email' => $user->email,
                'position' => $user->position?->name,
                'departments' => $user->departments?->pluck('name')->toArray() ?? [],
            ],
            'request_details' => [
                'dates' => $ptoRequest->start_date->format('M d, Y').' - '.$ptoRequest->end_date->format('M d, Y'),
                'total_days' => $ptoRequest->total_days,
                'pto_type' => $ptoRequest->ptoType->name,
                'reason' => $ptoRequest->reason,
            ],
            'blackout_analysis' => [
                'has_conflicts' => $validation['has_conflicts'],
                'has_warnings' => $validation['has_warnings'],
                'conflicts' => [],
                'warnings' => [],
            ],
            'review_required' => $validation['has_conflicts'] || $validation['has_warnings'],
        ];

        // Process conflicts for admin review
        foreach ($validation['conflicts'] as $conflict) {
            $blackout = $conflict['blackout'];
            $adminDetails['blackout_analysis']['conflicts'][] = [
                'blackout_name' => $blackout->name,
                'blackout_period' => $blackout->getFormattedDateRangeAttribute(),
                'restriction_type' => $blackout->restriction_type,
                'description' => $conflict['message'],
                'can_override' => $conflict['can_override'] ?? false,
                'is_strict' => $blackout->is_strict,
                'scope' => $this->getBlackoutScope($blackout),
                'additional_info' => $conflict['restriction_details'] ?? [],
            ];
        }

        // Process warnings for admin review
        foreach ($validation['warnings'] as $warning) {
            $blackout = $warning['blackout'];
            $adminDetails['blackout_analysis']['warnings'][] = [
                'blackout_name' => $blackout->name,
                'blackout_period' => $blackout->getFormattedDateRangeAttribute(),
                'restriction_type' => $blackout->restriction_type,
                'description' => $warning['message'],
                'scope' => $this->getBlackoutScope($blackout),
                'additional_info' => $warning['restriction_details'] ?? [],
            ];
        }

        return $adminDetails;
    }

    /**
     * Get blackout scope information for admin review
     */
    private function getBlackoutScope(PtoBlackout $blackout): array
    {
        if ($blackout->is_company_wide) {
            return [
                'type' => 'company_wide',
                'description' => 'Applies to all employees',
            ];
        }

        $scope = [];

        if ($blackout->position_id) {
            $position = Position::find($blackout->position_id);
            $scope[] = 'Position: '.($position?->name ?? 'Unknown');
        }

        if ($blackout->department_ids) {
            $departments = Department::whereIn('id', $blackout->department_ids)->pluck('name')->toArray();
            $scope[] = 'Departments: '.implode(', ', $departments);
        }

        if ($blackout->user_ids) {
            $users = User::whereIn('id', $blackout->user_ids)->pluck('name')->toArray();
            $scope[] = 'Specific Users: '.implode(', ', $users);
        }

        return [
            'type' => 'targeted',
            'description' => implode(' | ', $scope),
        ];
    }

    /**
     * Generate admin approval recommendation based on blackout analysis
     */
    public function getApprovalRecommendation(PtoRequest $ptoRequest): array
    {
        $adminDetails = $this->getBlackoutDetailsForAdmin($ptoRequest);

        $recommendation = [
            'action' => 'review',
            'priority' => 'normal',
            'reasoning' => [],
            'considerations' => [],
        ];

        // Analyze conflicts
        if ($adminDetails['blackout_analysis']['has_conflicts']) {
            $recommendation['action'] = 'careful_review';
            $recommendation['priority'] = 'high';
            $recommendation['reasoning'][] = 'Request conflicts with blackout periods';

            foreach ($adminDetails['blackout_analysis']['conflicts'] as $conflict) {
                if ($conflict['is_strict']) {
                    $recommendation['action'] = 'likely_deny';
                    $recommendation['priority'] = 'urgent';
                    $recommendation['reasoning'][] = 'Conflicts with strict blackout: '.$conflict['blackout_name'];
                }

                if (! $conflict['can_override']) {
                    $recommendation['considerations'][] = 'No override permitted for: '.$conflict['blackout_name'];
                }
            }
        }

        // Analyze warnings
        if ($adminDetails['blackout_analysis']['has_warnings']) {
            foreach ($adminDetails['blackout_analysis']['warnings'] as $warning) {
                if (isset($warning['additional_info']['will_consume_slot'])) {
                    $recommendation['considerations'][] = 'Will consume limited slot for: '.$warning['blackout_name'];
                }

                if (isset($warning['additional_info']['requires_justification'])) {
                    $recommendation['considerations'][] = 'Business justification required for: '.$warning['blackout_name'];
                }
            }
        }

        return $recommendation;
    }

    /**
     * Auto-reject a PTO request due to blackout conflicts
     */
    public function autoRejectForBlackout(PtoRequest $ptoRequest): void
    {
        $user = $ptoRequest->user;
        $validation = $this->validatePtoRequest(
            $user,
            $ptoRequest->start_date,
            $ptoRequest->end_date,
            $ptoRequest->pto_type_id
        );

        if ($validation['has_conflicts']) {
            $conflictMessages = collect($validation['conflicts'])->pluck('message')->toArray();
            $denialReason = "Automatically rejected due to blackout period conflicts:\n".implode("\n", $conflictMessages);

            $ptoRequest->update([
                'status' => 'denied',
                'denied_at' => now(),
                'denial_reason' => $denialReason,
            ]);

            // Update pending balance
            if ($ptoRequest->ptoType->uses_balance) {
                $balance = $ptoRequest->user->ptoBalances()
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->first();

                if ($balance) {
                    $balance->subtractPendingBalance($ptoRequest->total_days);
                }
            }
        }
    }

    // Keep all existing methods...
    private function blackoutAppliesToUser(PtoBlackout $blackout, User $user): bool
    {
        if ($blackout->is_company_wide) {
            return true;
        }

        if ($blackout->user_ids && in_array($user->id, $blackout->user_ids)) {
            return true;
        }

        if ($blackout->position_id && $user->position_id == $blackout->position_id) {
            return true;
        }

        if ($blackout->department_ids) {
            $userDepartmentIds = $user->departments->pluck('id')->toArray();
            if (array_intersect($blackout->department_ids, $userDepartmentIds)) {
                return true;
            }
        }

        return false;
    }

    private function ptoTypeIsRestricted(PtoBlackout $blackout, int $ptoTypeId): bool
    {
        if (empty($blackout->pto_type_ids)) {
            return true;
        }

        return in_array($ptoTypeId, $blackout->pto_type_ids);
    }

    private function requestOverlapsWithHolidays(string $startDate, string $endDate): bool
    {
        $holidays = Holiday::getHolidaysInRange($startDate, $endDate);

        return ! empty($holidays);
    }

    private function processBlackoutRestriction(PtoBlackout $blackout, User $user, string $startDate, string $endDate, int $ptoTypeId, bool $isEmergency): array
    {
        switch ($blackout->restriction_type) {
            case 'full_block':
                return $this->processFullBlock($blackout, $isEmergency);

            case 'limit_requests':
                return $this->processLimitRequests($blackout, $user, $startDate, $endDate, $ptoTypeId);

            case 'warning_only':
                return $this->processWarningOnly($blackout);

            default:
                return $this->processFullBlock($blackout, $isEmergency);
        }
    }

    private function processFullBlock(PtoBlackout $blackout, bool $isEmergency): array
    {
        if ($isEmergency && $blackout->allow_emergency_override) {
            return [
                'type' => 'warning',
                'blackout' => $blackout,
                'message' => "Emergency override applied for blackout period: {$blackout->name}",
                'can_override' => true,
                'restriction_details' => [
                    'type' => 'emergency_override',
                    'period' => $blackout->getFormattedDateRangeAttribute(),
                    'requires_approval' => true,
                    'override_reason_required' => true,
                ],
            ];
        }

        return [
            'type' => 'conflict',
            'blackout' => $blackout,
            'message' => "PTO requests are blocked during: {$blackout->name} ({$blackout->getFormattedDateRangeAttribute()})",
            'can_override' => $blackout->allow_emergency_override,
            'restriction_details' => [
                'type' => 'full_block',
                'period' => $blackout->getFormattedDateRangeAttribute(),
                'strict' => $blackout->is_strict,
                'override_allowed' => $blackout->allow_emergency_override,
            ],
        ];
    }

    private function processLimitRequests(PtoBlackout $blackout, User $user, string $startDate, string $endDate, int $ptoTypeId): array
    {
        $existingRequestsCount = PtoRequest::where(function ($query) use ($blackout) {
            $query->where('start_date', '<=', $blackout->end_date)
                ->where('end_date', '>=', $blackout->start_date);
        })
            ->whereIn('status', ['approved', 'pending'])
            ->when($blackout->pto_type_ids, function ($query) use ($blackout) {
                return $query->whereIn('pto_type_id', $blackout->pto_type_ids);
            })
            ->when(! $blackout->is_company_wide, function ($query) use ($blackout) {
                return $query->where(function ($q) use ($blackout) {
                    if ($blackout->user_ids) {
                        $q->orWhereIn('user_id', $blackout->user_ids);
                    }
                    if ($blackout->position_id) {
                        $q->orWhereHas('user', function ($userQuery) use ($blackout) {
                            $userQuery->where('position_id', $blackout->position_id);
                        });
                    }
                    if ($blackout->department_ids) {
                        $q->orWhereHas('user.departments', function ($deptQuery) use ($blackout) {
                            $deptQuery->whereIn('department_id', $blackout->department_ids);
                        });
                    }
                });
            })
            ->count();

        if ($existingRequestsCount >= $blackout->max_requests_allowed) {
            return [
                'type' => 'conflict',
                'blackout' => $blackout,
                'message' => "Maximum number of PTO requests ({$blackout->max_requests_allowed}) already reached for blackout period: {$blackout->name}",
                'can_override' => $blackout->allow_emergency_override,
                'current_count' => $existingRequestsCount,
                'max_allowed' => $blackout->max_requests_allowed,
                'restriction_details' => [
                    'type' => 'limit_exceeded',
                    'period' => $blackout->getFormattedDateRangeAttribute(),
                    'remaining_slots' => 0,
                ],
            ];
        }

        return [
            'type' => 'warning',
            'blackout' => $blackout,
            'message' => "Limited PTO requests during: {$blackout->name}. {$existingRequestsCount}/{$blackout->max_requests_allowed} requests used.",
            'current_count' => $existingRequestsCount,
            'max_allowed' => $blackout->max_requests_allowed,
            'restriction_details' => [
                'type' => 'limited_availability',
                'period' => $blackout->getFormattedDateRangeAttribute(),
                'remaining_slots' => $blackout->max_requests_allowed - $existingRequestsCount,
                'will_consume_slot' => true,
            ],
        ];
    }

    private function processWarningOnly(PtoBlackout $blackout): array
    {
        return [
            'type' => 'warning',
            'blackout' => $blackout,
            'message' => "Note: Your request falls during a restricted period: {$blackout->name} ({$blackout->getFormattedDateRangeAttribute()})",
            'restriction_details' => [
                'type' => 'advisory_only',
                'period' => $blackout->getFormattedDateRangeAttribute(),
                'requires_justification' => true,
            ],
        ];
    }

    // Keep other existing methods...
    public function getBlackoutsForUser(User $user, ?string $startDate = null, ?string $endDate = null): Collection
    {
        $query = PtoBlackout::active();

        if ($startDate && $endDate) {
            $query->overlapping($startDate, $endDate);
        }

        return $query->get()->filter(function ($blackout) use ($user) {
            return $this->blackoutAppliesToUser($blackout, $user);
        });
    }

    public function getBlackoutConflictsForDisplay(User $user, string $startDate, string $endDate, int $ptoTypeId): array
    {
        $validation = $this->validatePtoRequest($user, $startDate, $endDate, $ptoTypeId);

        $displayData = [];

        foreach (array_merge($validation['conflicts'], $validation['warnings']) as $item) {
            $blackout = $item['blackout'];
            $displayData[] = [
                'id' => $blackout->id,
                'name' => $blackout->name,
                'description' => $blackout->description,
                'date_range' => $blackout->getFormattedDateRangeAttribute(),
                'restriction_type' => $blackout->restriction_type,
                'message' => $item['message'],
                'type' => $item['type'],
                'can_override' => $item['can_override'] ?? false,
            ];
        }

        return $displayData;
    }

    /**
     * Process recurring limit requests (complex logic for counting existing requests)
     */
    private function processRecurringLimitRequests(PtoBlackout $blackout, User $user, array $conflictingDays, string $recurringDayNames, int $ptoTypeId): array
    {
        // This is simplified - you might want more sophisticated logic
        // to count requests per day or per week/month depending on your business rules

        $daysList = implode(', ', $conflictingDays);

        // Count existing approved/pending requests that fall on the same recurring days
        // This is a basic implementation - you might need to refine based on your needs
        $existingCount = PtoRequest::whereIn('status', ['approved', 'pending'])
            ->when($blackout->pto_type_ids, function ($query) use ($blackout) {
                return $query->whereIn('pto_type_id', $blackout->pto_type_ids);
            })
            ->where(function ($query) use ($blackout) {
                // This is a simplified check - you'd need to implement proper day-of-week checking
                // You might want to add a more sophisticated query here
                $query->whereRaw('DAYOFWEEK(start_date) IN ('.implode(',', array_map(fn ($d) => $d + 1, $blackout->recurring_days)).')')
                    ->orWhereRaw('DAYOFWEEK(end_date) IN ('.implode(',', array_map(fn ($d) => $d + 1, $blackout->recurring_days)).')');
            })
            ->count();

        if ($existingCount >= $blackout->max_requests_allowed) {
            return [
                'type' => 'conflict',
                'blackout' => $blackout,
                'message' => "Maximum requests ({$blackout->max_requests_allowed}) reached for {$recurringDayNames}. Your request affects: {$daysList}",
                'can_override' => $blackout->allow_emergency_override,
                'conflicting_days' => $conflictingDays,
                'current_count' => $existingCount,
                'max_allowed' => $blackout->max_requests_allowed,
                'restriction_details' => [
                    'type' => 'recurring_limit_exceeded',
                    'recurring_days' => $recurringDayNames,
                    'conflicting_dates' => $daysList,
                    'remaining_slots' => 0,
                ],
            ];
        }

        return [
            'type' => 'warning',
            'blackout' => $blackout,
            'message' => "Limited requests on {$recurringDayNames}. {$existingCount}/{$blackout->max_requests_allowed} used. Your request affects: {$daysList}",
            'conflicting_days' => $conflictingDays,
            'current_count' => $existingCount,
            'max_allowed' => $blackout->max_requests_allowed,
            'restriction_details' => [
                'type' => 'recurring_limited_availability',
                'recurring_days' => $recurringDayNames,
                'conflicting_dates' => $daysList,
                'remaining_slots' => $blackout->max_requests_allowed - $existingCount,
            ],
        ];
    }
}
