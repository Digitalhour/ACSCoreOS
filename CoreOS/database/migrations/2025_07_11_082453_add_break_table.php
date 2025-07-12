<?php

use App\Models\TimeClock;
use App\Models\TimeClockAudit;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Create the new breaks table (from previous artifact)
        Schema::create('time_clock_breaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('time_clock_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('break_type_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('break_start_at');
            $table->timestamp('break_end_at')->nullable();
            $table->decimal('duration_minutes', 8, 2)->default(0);
            $table->enum('status', ['active', 'completed'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['time_clock_id', 'break_start_at']);
            $table->index(['user_id', 'status']);
        });

        // Step 2: Migrate existing break data from audit records to proper break records
        $this->migrateBreakDataFromAudits();

        // Step 3: Remove break fields from time_clocks table (keep break_duration for totals)
        Schema::table('time_clocks', function (Blueprint $table) {
            $table->dropColumn(['break_start_at', 'break_end_at', 'break_type_id']);
        });
    }

    public function down(): void
    {
        // Add back the break fields
        Schema::table('time_clocks', function (Blueprint $table) {
            $table->timestamp('break_start_at')->nullable();
            $table->timestamp('break_end_at')->nullable();
            $table->foreignId('break_type_id')->nullable()->constrained()->nullOnDelete();
        });

        Schema::dropIfExists('time_clock_breaks');
    }

    private function migrateBreakDataFromAudits(): void
    {
        // Get all time clock entries
        $timeClocks = TimeClock::all();

        foreach ($timeClocks as $timeClock) {
            $this->createBreakRecordsFromAudits($timeClock);
        }
    }

    private function createBreakRecordsFromAudits(TimeClock $timeClock): void
    {
        // Get break audit records for this time clock
        $breakAudits = TimeClockAudit::where('time_clock_id', $timeClock->id)
            ->whereIn('action', ['break_start', 'break_end'])
            ->orderBy('action_timestamp')
            ->get();

        $breaks = [];
        $currentBreak = null;

        // Pair up break_start and break_end audits
        foreach ($breakAudits as $audit) {
            if ($audit->action === 'break_start') {
                $currentBreak = [
                    'start_audit' => $audit,
                    'end_audit' => null,
                    'break_type_id' => $audit->additional_data['break_type_id'] ?? null,
                ];
            } elseif ($audit->action === 'break_end' && $currentBreak) {
                $currentBreak['end_audit'] = $audit;
                $breaks[] = $currentBreak;
                $currentBreak = null;
            }
        }

        // Handle unclosed break
        if ($currentBreak) {
            $breaks[] = $currentBreak;
        }

        // Create TimeClockBreak records
        foreach ($breaks as $breakData) {
            $startAudit = $breakData['start_audit'];
            $endAudit = $breakData['end_audit'];

            $breakStart = $startAudit->action_timestamp;
            $breakEnd = $endAudit?->action_timestamp;
            $durationMinutes = $breakEnd ? $breakStart->diffInMinutes($breakEnd) : 0;
            $status = $breakEnd ? 'completed' : 'active';

            DB::table('time_clock_breaks')->insert([
                'time_clock_id' => $timeClock->id,
                'user_id' => $timeClock->user_id,
                'break_type_id' => $breakData['break_type_id'],
                'break_start_at' => $breakStart,
                'break_end_at' => $breakEnd,
                'duration_minutes' => $durationMinutes,
                'status' => $status,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Recalculate total break duration in time_clocks table
        $totalBreakMinutes = DB::table('time_clock_breaks')
            ->where('time_clock_id', $timeClock->id)
            ->where('status', 'completed')
            ->sum('duration_minutes');

        $timeClock->update([
            'break_duration' => round($totalBreakMinutes / 60, 2)
        ]);
    }
};
