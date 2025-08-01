<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTO Request Denied</title>
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
        .denial-reason {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .denial-reason h4 {
            margin-top: 0;
            color: #dc2626;
            font-size: 16px;
        }
        .denial-reason p {
            color: #7f1d1d;
            font-style: italic;
        }
        .next-steps {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .next-steps h4 {
            margin-top: 0;
            color: #1e40af;
            font-size: 16px;
        }
        .support-box {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .support-box h4 {
            margin-top: 0;
            color: #059669;
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
        <p>Hi {{ $employee->first_name }},</p>

        <p>We regret to inform you that your PTO request has been denied. Please see the details below.</p>

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
                    <span class="detail-label">Original Reason:</span>
                    <span class="detail-value">{{ $ptoRequest->reason }}</span>
                </div>
            @endif
        </div>

        @if($denialReason)
            <div class="denial-reason">
                <h4>Reason for Denial</h4>
                <p>"{{ $denialReason }}"</p>
                @if($denier)
                    <p><strong>Denied by:</strong> {{ $denier->name }}</p>
                @endif
                @if($ptoRequest->denied_at)
                    <p><strong>Denied on:</strong> {{ $ptoRequest->denied_at->format('M d, Y \a\t g:i A') }}</p>
                @endif
            </div>
        @endif

        <div class="next-steps">
            <h4>What can you do next?</h4>
            <ul>
                <li>Review the reason for denial and consider if you can address the concerns</li>
                <li>Speak with your manager to discuss alternative dates or arrangements</li>
                <li>Submit a new request for different dates if appropriate</li>
                <li>Contact HR if you have questions about the denial</li>
            </ul>
        </div>

        <div class="support-box">
            <h4>Need Help?</h4>
            <p>If you have questions about this decision or need assistance with submitting a revised request, please don't hesitate to reach out to your manager or the HR department.</p>
        </div>

        <p>We understand this may be disappointing, and we're here to help you find a solution that works for both you and the team.</p>
    </div>

    <div class="footer">
        <p class="footer-company">{{ config('app.name') }}</p>
        <p>Human Resources Department</p>
    </div>
</div>
</body>
</html>
