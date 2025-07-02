<?php
// app/Http/Controllers/TrainingController.php
namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\GradeResult;
use App\Models\GradesResults;
use App\Models\Lesson;
use App\Models\LessonContent;
use App\Models\Module;
use App\Models\ProgressTracking;
use App\Models\Quiz;
use App\Models\Test;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TrainingController extends Controller
{
    public function index()
    {
        $modules = Module::active()
            ->with(['lessons', 'test', 'enrollments' => function($query) {
                $query->where('user_id', auth()->id());
            }])
            ->orderBy('order')
            ->get()
            ->map(function($module) {
                $module->is_enrolled = $module->enrollments->isNotEmpty();
                $module->progress_percentage = $module->getProgressPercentageForUser(auth()->id());
                $module->is_completed = $module->isCompletedBy(auth()->id());
                unset($module->enrollments);
                return $module;
            });

        return Inertia::render('Training/Index', [
            'modules' => $modules
        ]);
    }

    public function module($moduleId)
    {
        $module = Module::with([
            'lessons' => function($query) {
                $query->active()->orderBy('order')
                    ->with(['contents', 'quiz.questions', 'progressTracking' => function($q) {
                        $q->where('user_id', auth()->id());
                    }]);
            },
            'test.questions',
            'enrollments' => function($query) {
                $query->where('user_id', auth()->id());
            }
        ])->findOrFail($moduleId);

        if ($module->enrollments->isEmpty()) {
            return redirect()->route('training.enroll', $module)->with('error', 'You need to enroll in this module first.');
        }

        $lessons = $module->lessons->map(function($lesson) use ($module) {
            $lesson->is_completed = $lesson->isCompletedBy(auth()->id());
            $lesson->can_access = $lesson->canBeAccessedBy(auth()->id());
            $lesson->has_quiz = $lesson->quiz !== null;

            if ($lesson->quiz) {
                $lesson->quiz_attempts = $lesson->quiz->getAttemptsCountForUser(auth()->id());
                $lesson->quiz_best_score = $lesson->quiz->getBestGradeForUser(auth()->id())?->score;
            }

            return $lesson;
        });

        $moduleProgress = $module->getProgressPercentageForUser(auth()->id());

        $testAvailable = false;
        $testAttempts = 0;
        $testBestScore = null;

        if ($module->test) {
            // Test is available if all lessons are completed or test is not required
            $testAvailable = !$module->test_required || $moduleProgress >= 100;
            $testAttempts = $module->test->getAttemptsCountForUser(auth()->id());
            $testBestScore = $module->test->getBestGradeForUser(auth()->id())?->score;
        }

        return Inertia::render('Training/Module', [
            'module' => $module,
            'lessons' => $lessons,
            'progress' => $moduleProgress,
            'testAvailable' => $testAvailable,
            'testAttempts' => $testAttempts,
            'testBestScore' => $testBestScore
        ]);
    }

    public function lesson($moduleId, $lessonId)
    {
        $module = Module::findOrFail($moduleId);
        $lesson = Lesson::with([
            'contents' => function($query) {
                $query->orderBy('order');
            },
            'quiz.questions',
            'progressTracking' => function($query) {
                $query->where('user_id', auth()->id());
            }
        ])->findOrFail($lessonId);

        // Check if user can access this lesson
        if (!$lesson->canBeAccessedBy(auth()->id())) {
            return redirect()->route('training.module', $module)
                ->with('error', 'You must complete previous lessons first.');
        }

        // Mark lesson as started
        ProgressTracking::firstOrCreate([
            'user_id' => auth()->id(),
            'trackable_type' => Lesson::class,
            'trackable_id' => $lesson->id
        ])->markAsStarted();

        $lesson->is_completed = $lesson->isCompletedBy(auth()->id());
        $lesson->has_quiz = $lesson->quiz !== null;

        if ($lesson->quiz) {
            $lesson->quiz_attempts = $lesson->quiz->getAttemptsCountForUser(auth()->id());
            $lesson->quiz_best_score = $lesson->quiz->getBestGradeForUser(auth()->id())?->score;
            $lesson->can_retake_quiz = $module->allow_retakes || $lesson->quiz_attempts === 0;
        }

        // Get content progress
        $lesson->contents = $lesson->contents->map(function($content) {
            $content->is_completed = $content->isCompletedBy(auth()->id());
            return $content;
        });

        return Inertia::render('Training/Lesson', [
            'module' => $module,
            'lesson' => $lesson
        ]);
    }

    public function completeContent(Request $request, $contentId)
    {
        $content = LessonContent::findOrFail($contentId);

        $progress = ProgressTracking::firstOrCreate([
            'user_id' => auth()->id(),
            'trackable_type' => LessonContent::class,
            'trackable_id' => $content->id
        ]);

        $progress->markAsStarted();

        if ($request->time_spent) {
            $progress->addTimeSpent($request->time_spent);
        }

        if (!$progress->completed) {
            $progress->markAsCompleted();

            // Check if all content in lesson is completed
            $this->checkLessonCompletion($content->lesson);
        }

        return response()->json(['success' => true]);
    }

    public function quiz($moduleId, $lessonId)
    {
        $module = Module::findOrFail($moduleId);
        $lesson = Lesson::findOrFail($lessonId);
        $quiz = $lesson->quiz;

        if (!$quiz) {
            return redirect()->route('training.lesson', [$module, $lesson])
                ->with('error', 'This lesson does not have a quiz.');
        }

        $attempts = $quiz->getAttemptsCountForUser(auth()->id());

        if (!$module->allow_retakes && $attempts > 0) {
            return redirect()->route('training.lesson', [$module, $lesson])
                ->with('error', 'You have already taken this quiz and retakes are not allowed.');
        }

        $questions = $quiz->getQuestionsForAttempt();

        return Inertia::render('Training/Quiz', [
            'module' => $module,
            'lesson' => $lesson,
            'quiz' => $quiz,
            'questions' => $questions,
            'attempt_number' => $attempts + 1
        ]);
    }

    public function submitQuiz(Request $request, $moduleId, $lessonId)
    {
        $module = Module::findOrFail($moduleId);
        $lesson = Lesson::findOrFail($lessonId);
        $quiz = $lesson->quiz;

        $answers = $request->validate([
            'answers' => 'required|array',
            'started_at' => 'required|date',
            'time_spent' => 'nullable|integer'
        ]);

        $questions = $quiz->questions;
        $totalPoints = $questions->sum('points');
        $earnedPoints = 0;

        foreach ($questions as $question) {
            $userAnswer = $answers['answers'][$question->id] ?? null;
            if ($question->checkAnswer($userAnswer)) {
                $earnedPoints += $question->points;
            }
        }

        $score = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100) : 0;
        $passed = $score >= $quiz->passing_score;

        $attempts = $quiz->getAttemptsCountForUser(auth()->id());

        $gradeResult = GradesResults::create([
            'user_id' => auth()->id(),
            'gradeable_type' => Quiz::class,
            'gradeable_id' => $quiz->id,
            'answers' => $answers['answers'],
            'score' => $score,
            'total_points' => $totalPoints,
            'earned_points' => $earnedPoints,
            'passed' => $passed,
            'attempt_number' => $attempts + 1,
            'started_at' => $answers['started_at'],
            'completed_at' => now()
        ]);

        // If quiz is required and passed, mark lesson as completed
        if ($module->quiz_required && $passed) {
            $this->checkLessonCompletion($lesson);
        }

        return Inertia::render('Training/QuizResult', [
            'module' => $module,
            'lesson' => $lesson,
            'quiz' => $quiz,
            'result' => $gradeResult,
            'questions' => $questions,
            'show_results' => $quiz->show_results_immediately
        ]);
    }

    public function test($moduleId)
    {
        $module = Module::with('test.questions')->findOrFail($moduleId);
        $test = $module->test;

        if (!$test) {
            return redirect()->route('training.module', $module)
                ->with('error', 'This module does not have a test.');
        }

        // Check if test is available
        $moduleProgress = $module->getProgressPercentageForUser(auth()->id());
        if ($module->test_required && $moduleProgress < 100) {
            return redirect()->route('training.module', $module)
                ->with('error', 'You must complete all lessons before taking the test.');
        }

        $attempts = $test->getAttemptsCountForUser(auth()->id());

        if (!$module->allow_retakes && $attempts > 0) {
            return redirect()->route('training.module', $module)
                ->with('error', 'You have already taken this test and retakes are not allowed.');
        }

        $questions = $test->getQuestionsForAttempt();

        return Inertia::render('Training/Test', [
            'module' => $module,
            'test' => $test,
            'questions' => $questions,
            'attempt_number' => $attempts + 1
        ]);
    }

    public function submitTest(Request $request, $moduleId)
    {
        $module = Module::findOrFail($moduleId);
        $test = $module->test;

        $answers = $request->validate([
            'answers' => 'required|array',
            'started_at' => 'required|date',
            'time_spent' => 'nullable|integer'
        ]);

        $questions = $test->questions;
        $totalPoints = $questions->sum('points');
        $earnedPoints = 0;

        foreach ($questions as $question) {
            $userAnswer = $answers['answers'][$question->id] ?? null;
            if ($question->checkAnswer($userAnswer)) {
                $earnedPoints += $question->points;
            }
        }

        $score = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100) : 0;
        $passed = $score >= $test->passing_score;

        $attempts = $test->getAttemptsCountForUser(auth()->id());

        $gradeResult = GradesResults::create([
            'user_id' => auth()->id(),
            'gradeable_type' => Test::class,
            'gradeable_id' => $test->id,
            'answers' => $answers['answers'],
            'score' => $score,
            'total_points' => $totalPoints,
            'earned_points' => $earnedPoints,
            'passed' => $passed,
            'attempt_number' => $attempts + 1,
            'started_at' => $answers['started_at'],
            'completed_at' => now()
        ]);

        // If test is required and passed, mark module as completed
        if ($module->test_required && $passed) {
            $this->checkModuleCompletion($module);
        }

        return Inertia::render('Training/TestResult', [
            'module' => $module,
            'test' => $test,
            'result' => $gradeResult,
            'questions' => $questions,
            'show_results' => $test->show_results_immediately
        ]);
    }

    public function enroll($moduleId)
    {
        $module = Module::findOrFail($moduleId);

        $enrollment = Enrollment::firstOrCreate([
            'user_id' => auth()->id(),
            'module_id' => $module->id
        ], [
            'enrolled_at' => now(),
            'is_active' => true
        ]);

        return redirect()->route('training.module', $module)
            ->with('success', 'Successfully enrolled in ' . $module->title);
    }

    protected function checkLessonCompletion($lesson)
    {
        $module = $lesson->module;
        $allContentCompleted = true;

        // Check if all content is completed
        foreach ($lesson->contents as $content) {
            if (!$content->isCompletedBy(auth()->id())) {
                $allContentCompleted = false;
                break;
            }
        }

        // Check quiz requirement
        $quizPassed = true;
        if ($lesson->quiz && $module->quiz_required) {
            $bestGrade = $lesson->quiz->getBestGradeForUser(auth()->id());
            $quizPassed = $bestGrade && $bestGrade->passed;
        }

        if ($allContentCompleted && $quizPassed) {
            ProgressTracking::updateOrCreate([
                'user_id' => auth()->id(),
                'trackable_type' => Lesson::class,
                'trackable_id' => $lesson->id
            ], [
                'completed' => true,
                'completed_at' => now()
            ]);

            // Check if module is completed
            $this->checkModuleCompletion($module);
        }
    }

    protected function checkModuleCompletion($module)
    {
        $userId = auth()->id();
        $allLessonsCompleted = true;

        // Check if all lessons are completed
        foreach ($module->lessons as $lesson) {
            if (!$lesson->isCompletedBy($userId)) {
                $allLessonsCompleted = false;
                break;
            }
        }

        // Check test requirement
        $testPassed = true;
        if ($module->test && $module->test_required) {
            $bestGrade = $module->test->getBestGradeForUser($userId);
            $testPassed = $bestGrade && $bestGrade->passed;
        }

        if ($allLessonsCompleted && $testPassed) {
            $enrollment = Enrollment::where('user_id', $userId)
                ->where('module_id', $module->id)
                ->first();

            if ($enrollment) {
                $enrollment->markAsCompleted();
            }
        }
    }
}
