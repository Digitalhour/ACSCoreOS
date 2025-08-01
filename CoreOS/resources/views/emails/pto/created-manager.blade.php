<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTO Request - {{ $employee->name }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #0f172a;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        .header {
            background-color: #dc2626;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .employee-info {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .employee-info h3 {
            margin-top: 0;
            color: #92400e;
            font-size: 18px;
        }
        .pto-details {
            background-color: #f8fafc;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #dc2626;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: 600;
            color: #475569;
        }
        .detail-value {
            color: #0f172a;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }
        .action-box {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .action-box h3 {
            margin-top: 0;
            color: #1e40af;
            font-size: 18px;
        }
        .warning-box {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-box h4 {
            margin-top: 0;
            color: #dc2626;
            font-size: 16px;
        }
        .warning-list {
            margin: 10px 0;
            padding-left: 20px;
        }
        .warning-list li {
            color: #7f1d1d;
            margin-bottom: 5px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 5px 0;
            color: #64748b;
            font-size: 14px;
        }
        .footer-company {
            font-weight: 600;
            color: #0f172a;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .detail-row {
                flex-direction: column;
                gap: 5px;
            }
        }
    </style>
</head>
<body>
<div class="email-container">
    <div class="header">
        <h1>📋 PTO Request Needs Approval</h1>
    </div>

    <div class="content">
        <p>Hello {{ $recipient->first_name }},</p>

        <p>A new PTO request has been submitted by one of your direct reports and requires your approval.</p>

        <div class="employee-info">
            <h3>{{ $employee->name }}</h3>
            <p>{{ $employee->email }}</p>
        </div>

        <div class="pto-details">
            <div class="detail-row">
                <span class="detail-label">Request Number:</span>
                <span class="detail-value">{{ $ptoRequest->request_number }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">PTO Type:</span>
                <span class="detail-value">{{ $ptoType->name }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">{{ $ptoRequest->start_date->format('M d, Y') }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">{{ $ptoRequest->end_date->format('M d, Y') }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Total Days:</span>
                <span class="detail-value">{{ $ptoRequest->total_days }} day{{ $ptoRequest->total_days != 1 ? 's' : '' }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                    <span class="status-badge status-pending">Pending Approval</span>
                </span>
            </div>
            @if($ptoRequest->reason)
                <div class="detail-row">
                    <span class="detail-label">Reason:</span>
                    <span class="detail-value">{{ $ptoRequest->reason }}</span>
                </div>
            @endif
            <div class="detail-row">
                <span class="detail-label">Submitted:</span>
                <span class="detail-value">{{ $ptoRequest->created_at->format('M d, Y \a\t g:i A') }}</span>
            </div>
        </div>

        @if($ptoRequest->hasBlackoutConflicts() || $ptoRequest->hasBlackoutWarnings())
            <div class="warning-box">
                <h4>⚠️ Blackout Period Notice</h4>
                <p>This request overlaps with blackout periods:</p>
                <ul class="warning-list">
                    @if($ptoRequest->hasBlackoutConflicts())
                        @foreach($ptoRequest->getFormattedBlackoutConflicts() as $conflict)
                            <li><strong>CONFLICT:</strong> {{ $conflict['message'] }} ({{ $conflict['blackout_name'] }})</li>
                        @endforeach
                    @endif
                    @if($ptoRequest->hasBlackoutWarnings())
                        @foreach($ptoRequest->getFormattedBlackoutWarnings() as $warning)
                            <li><strong>WARNING:</strong> {{ $warning['message'] }} ({{ $warning['blackout_name'] }})</li>
                        @endforeach
                    @endif
                </ul>
                <p><em>Please review carefully before approving.</em></p>
            </div>
        @endif

        <div class="action-box">
            <h3>Action Required</h3>
            <p>Please log into the system to review and approve/deny this PTO request.</p>
            <p><strong>{{ $employee->name }}</strong> is waiting for your response.</p>
        </div>

        <p>If you have any questions about this request, please contact {{ $employee->name }} directly or reach out to the HR department.</p>

        <p>Thank you!</p>
    </div>

    <div class="footer">
        <p class="footer-company">{{ config('app.name') }}</p>
        <p>Human Resources Department</p>
    </div>
</div>
</body>
</html>
