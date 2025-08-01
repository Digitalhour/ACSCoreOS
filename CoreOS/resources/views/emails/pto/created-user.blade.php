<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTO Request Submitted</title>
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
            background-color: #0f172a;
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
            background-color: #f8fafc;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
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
        .message-box {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .message-box h3 {
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
        <h1>✅ PTO Request Submitted</h1>
    </div>

    <div class="content">
        <p>Hi {{ $employee->first_name }},</p>

        <p>Your PTO request has been successfully submitted and is now <strong>pending approval</strong>.</p>

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
                    <span class="status-badge status-pending">Pending</span>
                </span>
            </div>
            @if($ptoRequest->reason)
                <div class="detail-row">
                    <span class="detail-label">Reason:</span>
                    <span class="detail-value">{{ $ptoRequest->reason }}</span>
                </div>
            @endif
        </div>

        <div class="message-box">
            <h3>What happens next?</h3>
            <p>Your request has been sent to your manager for approval. You'll receive an email notification once your request has been reviewed.</p>
            @if($ptoRequest->hasBlackoutWarnings() || $ptoRequest->hasBlackoutConflicts())
                <p><strong>Note:</strong> Your request overlaps with blackout periods. This may affect the approval process.</p>
            @endif
        </div>

        <p>If you need to make any changes to this request, please contact your manager or HR department.</p>

        <p>Thank you!</p>
    </div>

    <div class="footer">
        <p class="footer-company">{{ config('app.name') }}</p>
        <p>Human Resources Department</p>
    </div>
</div>
</body>
</html>
