import React, {useEffect, useState} from 'react';
import {Clock, Coffee, Play, Square, Timer} from 'lucide-react';
import axios from 'axios';

const TimeClock = () => {
    const [status, setStatus] = useState({
        is_clocked_in: false,
        current_entry: null,
        current_break: null,
        total_time_today: '0:00',
        can_clock_in: true,
        can_clock_out: false,
        can_start_break: false,
        can_end_break: false,
    });
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [breakForm, setBreakForm] = useState({
        break_type: 'personal',
        break_label: '',
        notes: ''
    });

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Load initial status
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await axios.get('/api/timeclock/status');
            setStatus(response.data);
        } catch (error) {
            console.error('Failed to fetch status:', error);
        }
    };

    const handleClockIn = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/timeclock/clock-in', {
                location: await getCurrentLocation()
            });

            setStatus(response.data.status);
            showNotification('Successfully clocked in!', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to clock in';
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/timeclock/clock-out', {
                location: await getCurrentLocation()
            });

            setStatus(response.data.status);
            showNotification('Successfully clocked out!', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to clock out';
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStartBreak = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/timeclock/start-break', {
                ...breakForm,
                location: await getCurrentLocation()
            });

            setStatus(response.data.status);
            setShowBreakModal(false);
            setBreakForm({ break_type: 'personal', break_label: '', notes: '' });
            showNotification('Break started!', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to start break';
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEndBreak = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/timeclock/end-break', {
                location: await getCurrentLocation()
            });

            setStatus(response.data.status);
            showNotification('Break ended!', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to end break';
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = () => {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    () => resolve(null)
                );
            } else {
                resolve(null);
            }
        });
    };

    const showNotification = (message, type) => {
        // You can implement your notification system here
        console.log(`${type}: ${message}`);
    };

    const formatTime = (timeString) => {
        if (!timeString) return '--:--';
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getCurrentDuration = () => {
        if (!status.current_entry?.clock_in_time) return '0:00';

        const clockIn = new Date(status.current_entry.clock_in_time);
        const now = currentTime;
        const diffMs = now - clockIn;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;

        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };

    const getBreakDuration = () => {
        if (!status.current_break?.break_start) return '0:00';

        const breakStart = new Date(status.current_break.break_start);
        const now = currentTime;
        const diffMs = now - breakStart;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;

        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };

    const breakTypes = {
        lunch: 'Lunch Break',
        personal: 'Personal Break',
        rest: 'Rest Break',
        extended: 'Extended Break',
        other: 'Other'
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Clock</h1>
                <div className="text-lg font-mono text-gray-600 dark:text-gray-300">
                    {currentTime.toLocaleTimeString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })}
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Clock Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                            <p className={`text-lg font-semibold ${
                                status.is_clocked_in
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-900 dark:text-white'
                            }`}>
                                {status.is_clocked_in ? 'Clocked In' : 'Clocked Out'}
                            </p>
                        </div>
                        <div className={`p-3 rounded-full ${
                            status.is_clocked_in
                                ? 'bg-green-100 dark:bg-green-900'
                                : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                            <Clock className={`h-6 w-6 ${
                                status.is_clocked_in
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-400'
                            }`} />
                        </div>
                    </div>
                    {status.current_entry && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Clocked in at {formatTime(status.current_entry.clock_in_time)}
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Duration: {getCurrentDuration()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Break Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Break Status</p>
                            <p className={`text-lg font-semibold ${
                                status.current_break
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-gray-900 dark:text-white'
                            }`}>
                                {status.current_break ? 'On Break' : 'Working'}
                            </p>
                        </div>
                        <div className={`p-3 rounded-full ${
                            status.current_break
                                ? 'bg-amber-100 dark:bg-amber-900'
                                : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                            <Coffee className={`h-6 w-6 ${
                                status.current_break
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-gray-400'
                            }`} />
                        </div>
                    </div>
                    {status.current_break && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {breakTypes[status.current_break.break_type]} started at {formatTime(status.current_break.break_start)}
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Duration: {getBreakDuration()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Daily Total */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Total</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {status.total_time_today}
                            </p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                            <Timer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clock In/Out */}
                <button
                    onClick={status.can_clock_in ? handleClockIn : handleClockOut}
                    disabled={loading || (!status.can_clock_in && !status.can_clock_out)}
                    className={`w-full p-6 rounded-lg font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        status.can_clock_in
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                >
                    <div className="flex items-center justify-center space-x-2">
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : status.can_clock_in ? (
                            <Play className="h-6 w-6" />
                        ) : (
                            <Square className="h-6 w-6" />
                        )}
                        <span>{status.can_clock_in ? 'Clock In' : 'Clock Out'}</span>
                    </div>
                </button>

                {/* Break Controls */}
                <button
                    onClick={status.can_start_break ? () => setShowBreakModal(true) : handleEndBreak}
                    disabled={loading || (!status.can_start_break && !status.can_end_break)}
                    className={`w-full p-6 rounded-lg font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        status.can_start_break
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : status.can_end_break
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                >
                    <div className="flex items-center justify-center space-x-2">
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                            <Coffee className="h-6 w-6" />
                        )}
                        <span>
                            {status.can_start_break ? 'Start Break' :
                                status.can_end_break ? 'End Break' : 'Break Unavailable'}
                        </span>
                    </div>
                </button>
            </div>

            {/* Break Modal */}
            {showBreakModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Start Break
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Break Type
                                </label>
                                <select
                                    value={breakForm.break_type}
                                    onChange={(e) => setBreakForm({...breakForm, break_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    {Object.entries(breakTypes).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Custom Label (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={breakForm.break_label}
                                    onChange={(e) => setBreakForm({...breakForm, break_label: e.target.value})}
                                    placeholder="e.g., Doctor appointment"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={breakForm.notes}
                                    onChange={(e) => setBreakForm({...breakForm, notes: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => setShowBreakModal(false)}
                                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStartBreak}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Starting...' : 'Start Break'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeClock;
