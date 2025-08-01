<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTO Approved - {{ $employee->name }}</title>
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
            background-color: #059669;
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
            background-color: #d1fae5;
            border: 1px solid #059669;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .employee-info h3 {
            margin-top: 0;
            color: #047857;
            font-size: 18px;
        }
        .pto-details {
            background-color: #f0fdf4;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #059669;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #d1fae5;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: 600;
            color: #047857;
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
        .status-approved {
            background-color: #d1fae5;
            color: #047857;
        }
        .info-box {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .info-box h4 {
            margin-top: 0;
            color: #1e40af;
            font-size: 16px;
        }
        .calendar-notice {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .calendar-notice h4 {
            margin-top: 0;
            color: #92400e;
            font-size: 16px;
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
        <h1>✅ PTO Request Approved</h1>
    </div>

    <div class="content">
        <p>Hello {{ $recipient->first_name }},</p>

        <p>This is a confirmation that the following PTO request has been approved.</p>

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
                    <span class="status-badge status-approved">Approved</span>
                </span>
            </div>
            @if($ptoRequest->reason)
                <div class="detail-row">
                    <span class="detail-label">Reason:</span>
                    <span class="detail-value">{{ $ptoRequest->reason }}</span>
                </div>
            @endif
        </div>

        @if($approver)
            <div class="info-box">
                <h4>Approval Information</h4>
                <p><strong>Approved by:</strong> {{ $approver->name }}</p>
                <p><strong>Approved on:</strong> {{ $ptoRequest->approved_at->format('M d, Y \a\t g:i A') }}</p>
                @if($ptoRequest->approval_notes)
                    <p><strong>Approval notes:</strong> {{ $ptoRequest->approval_notes }}</p>
                @endif
            </div>
        @endif

        <div class="calendar-notice">
            <h4>📅 Don't Forget!</h4>
            <p><strong>{{ $employee->first_name }}</strong> will be out from {{ $ptoRequest->start_date->format('M d') }} to {{ $ptoRequest->end_date->format('M d, Y') }}</p>
            <p>Make sure to update team calendars and plan coverage as needed.</p>
        </div>

        <p><strong>Manager reminders:</strong></p>
        <ul>
            <li>Update team calendar with {{ $employee->first_name }}'s time off</li>
            <li>Arrange coverage for their responsibilities if needed</li>
            <li>Inform other team members who may be affected</li>
            @if($ptoRequest->total_days >= 5)
                <li>Consider redistributing any urgent projects or deadlines</li>
            @endif
        </ul>

        <p>{{ $employee->first_name }} has been notified that their request was approved.</p>

        <p>If you have any questions, please contact the HR department.</p>
    </div>

    <div class="footer">
        <p class="footer-company">{{ config('app.name') }}</p>
        <p>Human Resources Department</p>
    </div>
</div>
</body>
</html>
