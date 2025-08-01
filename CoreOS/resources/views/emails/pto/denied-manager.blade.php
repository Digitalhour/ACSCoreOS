<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTO Request Denied - {{ $employee->name }}</title>
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
            background-color: #fecaca;
            border: 1px solid #dc2626;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .employee-info h3 {
            margin-top: 0;
            color: #991b1b;
            font-size: 18px;
        }
        .pto-details {
            background-color: #fef2f2;
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
            border-bottom: 1px solid #fecaca;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: 600;
            color: #991b1b;
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
        .status-denied {
            background-color: #fecaca;
            color: #991b1b;
        }
        .denial-info {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .denial-info h4 {
            margin-top: 0;
            color: #dc2626;
            font-size: 16px;
        }
        .followup-box {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .followup-box h4 {
            margin-top: 0;
            color: #1e40af;
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
        <h1>❌ PTO Request Denied</h1>
    </div>

    <div class="content">
        <p>Hello {{ $recipient->first_name }},</p>

        <p>This is a confirmation that the following PTO request has been denied.</p>

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
                    <span class="status-badge status-denied">Denied</span>
                </span>
            </div>
            @if($ptoRequest->reason)
                <div class="detail-row">
                    <span class="detail-label">Employee's Reason:</span>
                    <span class="detail-value">{{ $ptoRequest->reason }}</span>
                </div>
            @endif
        </div>

        @if($denialReason || $denier)
            <div class="denial-info">
                <h4>Denial Information</h4>
                @if($denier)
                    <p><strong>Denied by:</strong> {{ $denier->name }}</p>
                @endif
                @if($ptoRequest->denied_at)
                    <p><strong>Denied on:</strong> {{ $ptoRequest->denied_at->format('M d, Y \a\t g:i A') }}</p>
                @endif
                @if($denialReason)
                    <p><strong>Reason for denial:</strong></p>
                    <p style="font-style: italic; color: #7f1d1d;">"{{ $denialReason }}"</p>
                @endif
            </div>
        @endif

        <div class="followup-box">
            <h4>Follow-up Recommendations</h4>
            <p>Since this request has been denied, consider the following steps:</p>
            <ul>
                <li><strong>Meet with {{ $employee->first_name }}</strong> to discuss the denial and explore alternatives</li>
                <li>Help them understand what factors led to the denial</li>
                <li>Work together to identify alternative dates that might work</li>
                <li>Provide guidance on future PTO requests to avoid similar issues</li>
                @if($ptoRequest->total_days >= 5)
                    <li>For extended time off, discuss advance planning requirements</li>
                @endif
            </ul>
        </div>

        <p>{{ $employee->first_name }} has been notified of the denial. As their manager, a follow-up conversation would be helpful to maintain good communication and team morale.</p>

        <p>If you have any questions about this decision or need HR support for the follow-up conversation, please reach out to the HR department.</p>
    </div>

    <div class="footer">
        <p class="footer-company">{{ config('app.name') }}</p>
        <p>Human Resources Department</p>
    </div>
</div>
</body>
</html>
