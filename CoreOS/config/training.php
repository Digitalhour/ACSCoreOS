<?php

return [
/*
|--------------------------------------------------------------------------
| Training System Configuration
|--------------------------------------------------------------------------
|
| This file contains configuration options for the training system.
|
*/

'defaults' => [
'sequential_lessons' => true,
'quiz_required' => false,
'test_required' => false,
'passing_score' => 70,
'allow_retakes' => true,
'time_limit' => null, // minutes
],

'file_upload' => [
'disk' => env('TRAINING_DISK', 's3'),
'max_size' => env('TRAINING_MAX_FILE_SIZE', 102400), // KB
'allowed_types' => [
'video' => ['mp4', 'avi', 'mov', 'wmv'],
'document' => ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
'audio' => ['mp3', 'wav', 'aac', 'ogg'],
'image' => ['jpg', 'jpeg', 'png', 'gif']
]
],

'certificates' => [
'enabled' => env('TRAINING_CERTIFICATES_ENABLED', true),
'template_path' => resource_path('views/certificates/template.blade.php'),
'storage_path' => 'certificates',
],

'notifications' => [
'enrollment' => true,
'completion' => true,
'quiz_results' => true,
'test_results' => true,
],

'progress_tracking' => [
'detailed' => true,
'time_tracking' => true,
'analytics' => true,
]
];
