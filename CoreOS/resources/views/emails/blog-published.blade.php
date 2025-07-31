<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $article->title }}</title>
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
        .content {
            padding: 30px;
        }
        .blog-content {
            font-size: 16px;
            line-height: 1.7;
            color: #334155;
        }
        .blog-content h1, .blog-content h2, .blog-content h3 {
            color: #0f172a;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .blog-content h1 { font-size: 24px; }
        .blog-content h2 { font-size: 22px; }
        .blog-content h3 { font-size: 20px; }
        .blog-content p {
            margin-bottom: 15px;
        }
        .blog-content img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 15px 0;
        }
        .blog-content blockquote {
            border-left: 4px solid #e2e8f0;
            margin: 20px 0;
            padding: 15px 20px;
            background-color: #f8fafc;
            font-style: italic;
        }
        .blog-content ul, .blog-content ol {
            padding-left: 20px;
            margin-bottom: 15px;
        }
        .blog-content li {
            margin-bottom: 5px;
        }
        .blog-content code {
            background-color: #f1f5f9;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
        }
        .blog-content pre {
            background-color: #f1f5f9;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
        }
        .blog-content pre code {
            background: none;
            padding: 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .view-online {
            display: inline-block;
            background-color: #0f172a;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .footer p {
            margin: 0;
            color: #64748b;
            font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
<div class="email-container">
    <div class="content">
        <div class="blog-content">
            {!! $article->content !!}
        </div>
    </div>

    <div class="footer">
        <a href="{{ $blogUrl }}" class="view-online">View Online</a>
        <p>{{ config('app.name') }}</p>
    </div>
</div>
</body>
</html>
