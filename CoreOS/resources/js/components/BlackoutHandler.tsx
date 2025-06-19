import React, {useCallback, useEffect, useState} from 'react';
import {AlertCircle, AlertTriangle, CheckCircle, Shield} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';

interface BlackoutConflict {
    id: number;
    name: string;
    description?: string;
    message: string;
    type: 'conflict' | 'warning';
    can_override: boolean;
    restriction_details?: {
        period?: string;
        type?: string;
        remaining_slots?: number;
        will_consume_slot?: boolean;
    };
    blackout?: {
        id: number;
        name: string;
        restriction_type: string;
        is_strict: boolean;
        allow_emergency_override: boolean;
    };
}

interface BlackoutHandlerProps {
    conflicts: BlackoutConflict[];
    warnings: BlackoutConflict[];
    onAcknowledgeWarnings?: (acknowledged: boolean) => void;
    onEmergencyOverride?: (enabled: boolean, reason?: string) => void;
    showActions?: boolean;
    className?: string;
}

export const BlackoutHandler: React.FC<BlackoutHandlerProps> = ({
                                                                    conflicts = [],
                                                                    warnings = [],
                                                                    onAcknowledgeWarnings,
                                                                    onEmergencyOverride,
                                                                    showActions = true,
                                                                    className = '',
                                                                }) => {
    const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
    const [emergencyOverride, setEmergencyOverride] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');
    const [showOverrideForm, setShowOverrideForm] = useState(false);

    const hasConflicts = conflicts.length > 0;
    const hasWarnings = warnings.length > 0;
    const canOverride = conflicts.some(c => c.can_override);

    useEffect(() => {
        if (onAcknowledgeWarnings) {
            onAcknowledgeWarnings(warningsAcknowledged);
        }
    }, [warningsAcknowledged, onAcknowledgeWarnings]);

    useEffect(() => {
        if (onEmergencyOverride) {
            onEmergencyOverride(emergencyOverride, overrideReason);
        }
    }, [emergencyOverride, overrideReason, onEmergencyOverride]);

    const handleWarningAcknowledgment = useCallback((checked: boolean) => {
        setWarningsAcknowledged(checked);
    }, []);

    const handleEmergencyOverrideToggle = useCallback((checked: boolean) => {
        setEmergencyOverride(checked);
        if (!checked) {
            setOverrideReason('');
            setShowOverrideForm(false);
        } else if (hasConflicts && canOverride) {
            setShowOverrideForm(true);
        }
    }, [hasConflicts, canOverride]);

    const formatConflictItem = (item: BlackoutConflict) => ({
        name: item.blackout?.name || item.name || 'Unknown Blackout',
        message: item.message || 'Blackout restriction detected',
        period: item.restriction_details?.period || 'Unknown period',
        canOverride: item.can_override || false,
        type: item.type || 'conflict',
        restrictionType: item.blackout?.restriction_type || 'unknown',
        isStrict: item.blackout?.is_strict || false,
    });

    if (!hasConflicts && !hasWarnings) {
        return null;
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Conflicts Section */}
            {hasConflicts && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800 mb-2">
                                Blackout Period Conflicts
                            </h3>
                            <div className="space-y-3">
                                {conflicts.map((conflict, index) => {
                                    const item = formatConflictItem(conflict);
                                    return (
                                        <div key={index} className="bg-white rounded border border-red-200 p-3">
                                            <div className="font-medium text-red-900 text-sm">
                                                {item.name}
                                            </div>
                                            <div className="text-red-700 text-sm mt-1">
                                                {item.message}
                                            </div>
                                            <div className="text-red-600 text-xs mt-1">
                                                Period: {item.period}
                                            </div>
                                            {item.isStrict && (
                                                <div className="text-red-800 text-xs mt-1 font-medium">
                                                    ⚠️ Strict blackout - No exceptions
                                                </div>
                                            )}
                                            {item.canOverride && !item.isStrict && (
                                                <div className="text-orange-600 text-xs mt-1">
                                                    Emergency override available
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Emergency Override Section */}
                            {canOverride && showActions && (
                                <div className="mt-4 pt-3 border-t border-red-200">
                                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                        <div className="flex items-start gap-3">
                                            <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Checkbox
                                                        id="emergency_override"
                                                        checked={emergencyOverride}
                                                        onCheckedChange={handleEmergencyOverrideToggle}
                                                    />
                                                    <Label htmlFor="emergency_override" className="text-sm font-medium text-orange-800">
                                                        Submit as Emergency Override
                                                    </Label>
                                                </div>
                                                <p className="text-xs text-orange-700 mb-2">
                                                    This will override blackout restrictions for urgent situations.
                                                    Your manager will be notified that this is an emergency request.
                                                </p>

                                                {showOverrideForm && emergencyOverride && (
                                                    <div className="mt-3 space-y-2">
                                                        <Label className="text-xs font-medium text-orange-800">
                                                            Emergency Justification (Required)
                                                        </Label>
                                                        <Textarea
                                                            value={overrideReason}
                                                            onChange={(e) => setOverrideReason(e.target.value)}
                                                            placeholder="Please explain why this emergency override is necessary..."
                                                            className="text-sm"
                                                            rows={3}
                                                        />
                                                        {overrideReason.trim().length < 10 && (
                                                            <p className="text-xs text-red-600">
                                                                Please provide a detailed explanation (minimum 10 characters).
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Warnings Section */}
            {hasWarnings && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-amber-800 mb-2">
                                Blackout Period Warnings
                            </h3>
                            <div className="space-y-3">
                                {warnings.map((warning, index) => {
                                    const item = formatConflictItem(warning);
                                    return (
                                        <div key={index} className="bg-white rounded border border-amber-200 p-3">
                                            <div className="font-medium text-amber-900 text-sm">
                                                {item.name}
                                            </div>
                                            <div className="text-amber-700 text-sm mt-1">
                                                {item.message}
                                            </div>
                                            <div className="text-amber-600 text-xs mt-1">
                                                Period: {item.period}
                                            </div>
                                            {warning.restriction_details?.will_consume_slot && (
                                                <div className="text-amber-700 text-xs mt-1">
                                                    ⚠️ Will consume one of the limited slots for this period
                                                </div>
                                            )}
                                            {warning.restriction_details?.remaining_slots !== undefined && (
                                                <div className="text-amber-600 text-xs mt-1">
                                                    Remaining slots: {warning.restriction_details.remaining_slots}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Warning Acknowledgment Section */}
                            {showActions && (
                                <div className="mt-4 pt-3 border-t border-amber-200">
                                    {warningsAcknowledged ? (
                                        <div className="flex items-center text-sm text-green-700">
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Warnings acknowledged
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2">
                                                <Checkbox
                                                    id="acknowledge_warnings"
                                                    checked={warningsAcknowledged}
                                                    onCheckedChange={handleWarningAcknowledgment}
                                                />
                                                <Label htmlFor="acknowledge_warnings" className="text-sm text-amber-700 leading-relaxed">
                                                    I understand these restrictions and acknowledge that my request falls during a restricted period.
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary for submission requirements */}
            {(hasConflicts || hasWarnings) && showActions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">
                        <strong>Submission Requirements:</strong>
                        {hasConflicts && !emergencyOverride && ' Cannot submit due to blackout conflicts.'}
                        {hasConflicts && emergencyOverride && overrideReason.trim().length >= 10 && ' Ready to submit with emergency override.'}
                        {hasConflicts && emergencyOverride && overrideReason.trim().length < 10 && ' Emergency justification required.'}
                        {!hasConflicts && hasWarnings && !warningsAcknowledged && ' Must acknowledge warnings to proceed.'}
                        {!hasConflicts && hasWarnings && warningsAcknowledged && ' Ready to submit with acknowledged warnings.'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlackoutHandler;
