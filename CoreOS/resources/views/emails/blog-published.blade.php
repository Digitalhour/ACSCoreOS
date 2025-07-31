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
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .featured-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            display: block;
        }
        .content {
            padding: 30px;
        }
        .meta {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
        }
        .author-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .author-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 16px;
        }
        .author-details h4 {
            margin: 0;
            font-size: 14px;
            color: #495057;
        }
        .author-details p {
            margin: 2px 0 0 0;
            font-size: 12px;
            color: #6c757d;
        }
        .reading-time {
            margin-left: auto;
            background-color: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #6c757d;
        }
        .blog-content {
            font-size: 16px;
            line-height: 1.7;
        }
        .blog-content h1, .blog-content h2, .blog-content h3 {
            color: #2c3e50;
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
            border-left: 4px solid #667eea;
            margin: 20px 0;
            padding: 15px 20px;
            background-color: #f8f9fa;
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
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
        }
        .blog-content pre {
            background-color: #f8f9fa;
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
            background-color: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .view-online {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .footer p {
            margin: 0;
            color: #6c757d;
            font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .header {
                padding: 20px;
            }
            .header h1 {
                font-size: 24px;
            }
            .content {
                padding: 20px;
            }
            .meta {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .reading-time {
                margin-left: 0;
            }
        }
    </style>
</head>
<body>
<div class="email-container">
    <div class="header">
        <h1>{{ $article->title }}</h1>
        <p>A new blog post has been published</p>
    </div>

    @if($article->featured_image)
        <img src="{{ asset('storage/' . $article->featured_image) }}" alt="{{ $article->title }}" class="featured-image">
    @endif

    <div class="content">
        <div class="meta">
            <div class="author-info">
                <div class="author-avatar">
                    @if($author->avatar)
                        <img src="{{ asset('storage/' . $author->avatar) }}" alt="{{ $author->name }}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    @else
                        {{ strtoupper(substr($author->name, 0, 1)) }}
                    @endif
                </div>
                <div class="author-details">
                    <h4>{{ $author->name }}</h4>
                    <p>Published {{ $article->published_at->format('M d, Y \a\t g:i A') }}</p>
                </div>
            </div>
            <div class="reading-time">{{ $article->reading_time }} min read</div>
        </div>

        @if($article->excerpt)
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #667eea;">
                <p style="margin: 0; font-style: italic; color: #495057; font-size: 18px;">{{ $article->excerpt }}</p>
            </div>
        @endif

        <div class="blog-content">
            {!! $article->content !!}
        </div>
    </div>

    <div class="footer">
        <a href="{{ $blogUrl }}" class="view-online">View Online</a>
        <p>This email was sent because a new blog post was published on {{ config('app.name') }}.</p>
    </div>
</div>
</body>
</html>
