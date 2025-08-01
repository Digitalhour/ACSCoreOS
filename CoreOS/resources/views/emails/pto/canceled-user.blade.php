<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTO Request Canceled</title>
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
            background-color: #6b7280;
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
            background-color: #f9fafb;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #6b7280;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
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
        .status-canceled {
            background-color: #e5e7eb;
            color: #374151;
        }
        .cancellation-info {
            background-color: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .cancellation-info h4 {
            margin-top: 0;
            color: #374151;
            font-size: 16px;
        }
        .balance-info {
            background-color: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .balance-info h4 {
            margin-top: 0;
            color: #1e40af;
            font-size: 16px;
        }
        .resubmit-box {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .resubmit-box h4 {
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
        <h1>🚫 PTO Request Canceled</h1>
    </div>

    <div class="content">
        <p>Hi {{ $employee->first_name }},</p>

        <p>Your PTO request has been canceled. Please see the details below.</p>

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
                    <span class="status-badge status-canceled">Canceled</span>
                </span>
            </div>
            @if($ptoRequest->reason)
                <div class="detail-row">
                    <span class="detail-label">Original Reason:</span>
                    <span class="detail-value">{{ $ptoRequest->reason }}</span>
                </div>
            @endif
        </div>

        @if($cancellationReason || $canceledBy)
            <div class="cancellation-info">
                <h4>Cancellation Details</h4>
                @if($canceledBy)
                    <p><strong>Canceled by:</strong> {{ $canceledBy->name }}</p>
                @endif
                @if($ptoRequest->cancelled_at)
                    <p><strong>Canceled on:</strong> {{ $ptoRequest->cancelled_at->format('M d, Y \a\t g:i A') }}</p>
                @endif
                @if($cancellationReason)
                    <p><strong>Reason:</strong> {{ $cancellationReason }}</p>
                @endif
            </div>
        @endif

        @if($ptoType->uses_balance)
            <div class="balance-info">
                <h4>💰 PTO Balance Update</h4>
                <p>The {{ $ptoRequest->total_days }} day{{ $ptoRequest->total_days != 1 ? 's' : '' }} from this canceled request
                    @if($ptoRequest->status === 'approved')
                        have been returned to your PTO balance.
                    @else
                        are now available for future requests.
                    @endif
                </p>
            </div>
        @endif

        <div class="resubmit-box">
            <h4>Need Time Off?</h4>
            <p>If you still need time off, you can submit a new PTO request for different dates through the system.</p>
        </div>

        <p>If you have any questions about this cancellation or need assistance with submitting a new request, please contact your manager or the HR department.</p>

        <p>Thank you for your understanding.</p>
    </div>

    <div class="footer">
        <p class="footer-company">{{ config('app.name') }}</p>
        <p>Human Resources Department</p>
    </div>
</div>
</body>
</html>
