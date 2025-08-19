<?php

namespace App\Http\Controllers;

use App\Models\OldStyleTrainingActivityLog;
use App\Models\OldStyleTrainingGrade;
use App\Models\OldStyleTrainingLesson;
use App\Models\OldStyleTrainingModule;
use App\Models\OldStyleTrainingQuiz;
use App\Models\OldStyleTrainingTest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class OldStyleTrainingTrackingController extends Controller
{
    public function index()
    {
        // Get users and format them as employees
        $users = User::orderBy('name')->get()->map(function ($user) {
            return [
                'employee_id' => $user->id,
                'employee_first_name' => $this->getFirstName($user->name),
                'employee_last_name' => $this->getLastName($user->name),
                'employee_hire_date' => $user->created_at->format('Y-m-d'),
                'employee_status' => $user->email_verified_at ? 'Active' : 'Inactive',
                'full_name' => $user->name,
                'email' => $user->email,
            ];
        });

        // Load grades with employee relationship - now this will work correctly
        $grades = OldStyleTrainingGrade::with('employee')->orderBy('created_at', 'desc')->get()->map(function ($grade) {
            // Map the user relationship to match the expected structure
            if ($grade->employee) {
                $grade->employee = [
                    'employee_id' => $grade->employee->id,
                    'full_name' => $grade->employee->name,
                    'email' => $grade->employee->email,
                ];
            } else {
                // Handle case where employee relationship is missing
                $grade->employee = [
                    'employee_id' => $grade->grade_employee_id,
                    'full_name' => 'User Not Found',
                    'email' => '',
                ];
            }
            return $grade;
        });

        $data = [
            'modules' => OldStyleTrainingModule::orderBy('module_name')->get(),
            'lessons' => OldStyleTrainingLesson::with('module')->orderBy('lesson_name')->get(),
            'quizzes' => OldStyleTrainingQuiz::with('lesson')->orderBy('quiz_name')->get(),
            'tests' => OldStyleTrainingTest::with('module')->orderBy('test_name')->get(),
            'employees' => $users,
            'grades' => $grades,
            'logs' => OldStyleTrainingActivityLog::orderBy('created_at', 'desc')->limit(100)->get(),
            'activeModules' => OldStyleTrainingModule::where('module_status', 'Active')->get(),
            'activeLessons' => OldStyleTrainingLesson::where('lesson_status', 'Active')->get(),
            'activeQuizzes' => OldStyleTrainingQuiz::where('quiz_status', 'Active')->get(),
            'activeTests' => OldStyleTrainingTest::where('test_status', 'Active')->get()
        ];

        return Inertia::render('OldStyleTrainingTracking/Index', $data);
    }

    public function store(Request $request)
    {
        $type = $request->input('type');
        $rules = $this->getDynamicRules($type, $request);
        $validated = $request->validate($rules);

        $data = $this->prepareData($type, $validated);

        $item = match($type) {
            'module' => OldStyleTrainingModule::create($data),
            'lesson' => OldStyleTrainingLesson::create($data),
            'quiz' => OldStyleTrainingQuiz::create($data),
            'test' => OldStyleTrainingTest::create($data),
            'grade' => OldStyleTrainingGrade::create($data),
        };

        // For grades, get the employee name for better logging
        $logName = $type === 'grade'
            ? $this->getGradeLogName($validated, $item)
            : $validated['name'];

        $this->logActivity('Created', ucfirst($type), "Created {$type}: {$logName}", $item->getKey());

        return Redirect::back()->with('message', ucfirst($type) . ' created successfully');
    }

    public function update(Request $request, $type, $id)
    {
        $rules = $this->getDynamicRules($type, $request);
        $validated = $request->validate($rules);

        $item = match($type) {
            'module' => OldStyleTrainingModule::findOrFail($id),
            'lesson' => OldStyleTrainingLesson::findOrFail($id),
            'quiz' => OldStyleTrainingQuiz::findOrFail($id),
            'test' => OldStyleTrainingTest::findOrFail($id),
            'grade' => OldStyleTrainingGrade::findOrFail($id),
        };

        $previous = $item->toArray();
        $data = $this->prepareData($type, $validated);
        $item->update($data);

        // For grades, get the employee name for better logging
        $logName = $type === 'grade'
            ? $this->getGradeLogName($validated, $item)
            : $validated['name'];

        $this->logActivity('Updated', ucfirst($type), "Updated {$type}: {$logName}", $id, $previous, $data);

        return Redirect::back()->with('message', ucfirst($type) . ' updated successfully');
    }

    public function destroy($type, $id)
    {
        $item = match($type) {
            'module' => OldStyleTrainingModule::findOrFail($id),
            'lesson' => OldStyleTrainingLesson::findOrFail($id),
            'quiz' => OldStyleTrainingQuiz::findOrFail($id),
            'test' => OldStyleTrainingTest::findOrFail($id),
            'grade' => OldStyleTrainingGrade::with('employee')->findOrFail($id),
        };

        if ($type === 'grade') {
            $employeeName = $item->employee ? $item->employee->name : 'Unknown User';
            $name = "Employees: {$employeeName}, Assessment: {$item->grade_assessment_type} ID {$item->grade_assessment_id}";
        } else {
            $name = $item->getAttribute($this->getNameField($type));
        }

        $previous = $item->toArray();
        $item->delete();

        $this->logActivity('Deleted', ucfirst($type), "Deleted {$type}: {$name}", $id, $previous);

        return Redirect::back()->with('message', ucfirst($type) . ' deleted successfully');
    }

    public function exportData()
    {
        $csv = $this->generateCSVData();
        $filename = 'old_style_training_data_' . now()->format('Y_m_d_H_i_s') . '.csv';

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportLogs()
    {
        $logs = OldStyleTrainingActivityLog::orderBy('created_at', 'desc')->get();
        $csv = "ID,Timestamp,Action,Type,Details,Log Type ID,Previous Value,New Value\n";

        foreach ($logs as $log) {
            $csv .= sprintf(
                "%d,\"%s\",\"%s\",\"%s\",\"%s\",%s,\"%s\",\"%s\"\n",
                $log->log_id,
                $log->created_at?->toISOString() ?? '',
                $log->log_action ?? '',
                $log->log_type ?? '',
                str_replace('"', '""', $log->log_details ?? ''),
                $log->log_type_id ?? '',
                str_replace('"', '""', json_encode($log->previous_value) ?? ''),
                str_replace('"', '""', json_encode($log->new_value) ?? '')
            );
        }

        $filename = 'old_style_training_logs_' . now()->format('Y_m_d_H_i_s') . '.csv';

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function getDynamicRules($type, Request $request)
    {
        return match($type) {
            'module' => [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'required|in:Active,Inactive'
            ],
            'lesson' => [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'required|in:Active,Inactive',
                'moduleId' => 'required|exists:old_style_training_modules,module_id'
            ],
            'quiz' => [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'required|in:Active,Inactive',
                'lessonId' => 'required|exists:old_style_training_lessons,lesson_id'
            ],
            'test' => [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'required|in:Active,Inactive',
                'moduleId' => 'required|exists:old_style_training_modules,module_id'
            ],
            'grade' => [
                'employeeId' => 'required|exists:users,id',
                'assessmentType' => 'required|in:Quiz,Test',
                'assessmentId' => [
                    'required',
                    'integer',
                    'min:1',
                    function ($attribute, $value, $fail) use ($request) {
                        $type = $request->input('assessmentType');
                        if ($type === 'Quiz') {
                            $exists = OldStyleTrainingQuiz::where('quiz_id', $value)
                                ->where('quiz_status', 'Active')
                                ->exists();
                        } else {
                            $exists = OldStyleTrainingTest::where('test_id', $value)
                                ->where('test_status', 'Active')
                                ->exists();
                        }

                        if (!$exists) {
                            $fail("The selected assessment does not exist or is inactive.");
                        }
                    }
                ],
                'score' => 'required|numeric|min:0|max:100'
            ],
            default => []
        };
    }

    private function prepareData($type, $validated)
    {
        return match($type) {
            'module' => [
                'module_name' => $validated['name'],
                'module_description' => $validated['description'],
                'module_status' => $validated['status']
            ],
            'lesson' => [
                'lesson_name' => $validated['name'],
                'lesson_description' => $validated['description'],
                'lesson_status' => $validated['status'],
                'module_id' => $validated['moduleId']
            ],
            'quiz' => [
                'quiz_name' => $validated['name'],
                'quiz_description' => $validated['description'],
                'quiz_status' => $validated['status'],
                'lesson_id' => $validated['lessonId']
            ],
            'test' => [
                'test_name' => $validated['name'],
                'test_description' => $validated['description'],
                'test_status' => $validated['status'],
                'module_id' => $validated['moduleId']
            ],
            'grade' => [
                'grade_employee_id' => $validated['employeeId'],
                'grade_assessment_id' => $validated['assessmentId'],
                'grade_assessment_type' => $validated['assessmentType'],
                'grade_score' => (float) $validated['score']
            ],
            'employee' => array_filter([
                'name' => $validated['employee_first_name'].' '.$validated['employee_last_name'],
                'email' => $validated['email'] ?? $this->generateEmail($validated['employee_first_name'],
                        $validated['employee_last_name']),
                'password' => isset($validated['password']) ? bcrypt($validated['password']) : null,
                'email_verified_at' => $validated['employee_status'] === 'Active' ? now() : null,
            ])
        };
    }

    private function generateCSVData()
    {
        $csv = "Table,ID,Name,Description,Status,Created,Updated,Module ID,Lesson ID,Employees ID,Assessment ID,Assessment Type,Score\n";

        // Modules
        foreach (OldStyleTrainingModule::all() as $m) {
            $csv .= sprintf("Module,%d,\"%s\",\"%s\",%s,%s,%s,,,,,,,\n",
                $m->module_id,
                str_replace('"', '""', $m->module_name ?? ''),
                str_replace('"', '""', $m->module_description ?? ''),
                $m->module_status ?? '',
                $m->created_at?->toISOString() ?? '',
                $m->updated_at?->toISOString() ?? ''
            );
        }

        // Lessons
        foreach (OldStyleTrainingLesson::all() as $l) {
            $csv .= sprintf("Lesson,%d,\"%s\",\"%s\",%s,%s,%s,%d,,,,,,\n",
                $l->lesson_id,
                str_replace('"', '""', $l->lesson_name ?? ''),
                str_replace('"', '""', $l->lesson_description ?? ''),
                $l->lesson_status ?? '',
                $l->created_at?->toISOString() ?? '',
                $l->updated_at?->toISOString() ?? '',
                $l->module_id ?? 0
            );
        }

        // Quizzes
        foreach (OldStyleTrainingQuiz::all() as $q) {
            $csv .= sprintf("Quiz,%d,\"%s\",\"%s\",%s,%s,%s,,%d,,,,,\n",
                $q->quiz_id,
                str_replace('"', '""', $q->quiz_name ?? ''),
                str_replace('"', '""', $q->quiz_description ?? ''),
                $q->quiz_status ?? '',
                $q->created_at?->toISOString() ?? '',
                $q->updated_at?->toISOString() ?? '',
                $q->lesson_id ?? 0
            );
        }

        // Tests
        foreach (OldStyleTrainingTest::all() as $t) {
            $csv .= sprintf("Test,%d,\"%s\",\"%s\",%s,%s,%s,%d,,,,,,\n",
                $t->test_id,
                str_replace('"', '""', $t->test_name ?? ''),
                str_replace('"', '""', $t->test_description ?? ''),
                $t->test_status ?? '',
                $t->created_at?->toISOString() ?? '',
                $t->updated_at?->toISOString() ?? '',
                $t->module_id ?? 0
            );
        }

        // Grades with employee names
        foreach (OldStyleTrainingGrade::with('employee')->get() as $g) {
            $employeeName = $g->employee ? $g->employee->name : 'Unknown User';
            $csv .= sprintf("Grade,%d,\"%s\",,,,%s,%s,,,%d,%d,\"%s\",%.2f\n",
                $g->grade_id,
                str_replace('"', '""', $employeeName),
                $g->created_at?->toISOString() ?? '',
                $g->updated_at?->toISOString() ?? '',
                $g->grade_employee_id ?? 0,
                $g->grade_assessment_id ?? 0,
                $g->grade_assessment_type ?? '',
                $g->grade_score ?? 0
            );
        }

        return $csv;
    }

    private function getGradeLogName($validated, $item)
    {
        $user = User::find($validated['employeeId']);
        $userName = $user ? $user->name : 'Unknown User';

        return "Employees: {$userName}, Assessment: {$validated['assessmentType']} ID {$validated['assessmentId']}, Score: {$validated['score']}%";
    }

    private function logActivity($action, $type, $details, $typeId, $previous = null, $new = null)
    {
        OldStyleTrainingActivityLog::create([
            'log_action' => $action,
            'log_type' => $type,
            'log_details' => $details,
            'log_type_id' => $typeId,
            'previous_value' => $previous,
            'new_value' => $new
        ]);
    }

    private function getNameField($type)
    {
        return match($type) {
            'module' => 'module_name',
            'lesson' => 'lesson_name',
            'quiz' => 'quiz_name',
            'test' => 'test_name',
            default => 'name'
        };
    }

    private function getFirstName($fullName)
    {
        $parts = explode(' ', $fullName);
        return $parts[0] ?? '';
    }

    private function getLastName($fullName)
    {
        $parts = explode(' ', $fullName);
        return count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    }
}
