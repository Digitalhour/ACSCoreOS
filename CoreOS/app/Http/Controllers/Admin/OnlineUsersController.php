<?php

namespace App\Http\Controllers\Admin;

use App\Events\UserOffline;
use App\Events\UserOnline;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

class OnlineUsersController extends Controller
{
    public function getOnlineUsers(): \Illuminate\Http\JsonResponse
    {
        $onlineUsers = $this->getOnlineUsersList();
        
        return response()->json([
            'count' => count($onlineUsers),
            'users' => $onlineUsers
        ]);
    }

    public function updateUserStatus(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        $status = $request->input('status', 'online');
        
        if ($status === 'online') {
            $this->setUserOnline($user->id);
            UserOnline::dispatch($user);
        } else {
            $this->setUserOffline($user->id);
            UserOffline::dispatch($user);
        }
        
        return response()->json(['success' => true]);
    }

    public function heartbeat(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        $this->setUserOnline($user->id);
        
        return response()->json(['success' => true]);
    }

    private function setUserOnline(int $userId): void
    {
        $key = "user:online:{$userId}";
        Cache::put($key, true, now()->addMinutes(5));
    }

    private function setUserOffline(int $userId): void
    {
        $key = "user:online:{$userId}";
        Cache::forget($key);
    }

    private function getOnlineUsersList(): array
    {
        try {
            $pattern = 'user:online:*';
            $keys = Cache::getStore()->getRedis()->keys($pattern);
            
            if (empty($keys)) {
                return [];
            }
            
            $userIds = array_map(function($key) {
                return (int) str_replace('user:online:', '', $key);
            }, $keys);
            
            return User::whereIn('id', $userIds)
                ->select('id', 'first_name', 'last_name', 'email')
                ->get()
                ->toArray();
        } catch (\Exception $e) {
            \Log::error('Failed to get online users from cache: ' . $e->getMessage());
            return [];
        }
    }
}
