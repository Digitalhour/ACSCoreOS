<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Vibetrack extends Model
{
    protected $connection = 'coreold';
    protected $table = 'Vibetrack';
    protected $fillable = ['json'];
    protected $casts = ['json' => 'array'];

    protected function deviceId(): Attribute
    {
        return Attribute::make(
            get: function () {
                $json = $this->json;

                // Direct device_id (runtime format)
                if (isset($json['device_id'])) {
                    return $json['device_id'];
                }

                // Modem format
                if (isset($json['modem']['device_id'])) {
                    return $json['modem']['device_id'];
                }

                return null;
            }
        );
    }

    protected function isRuntimeData(): Attribute
    {
        return Attribute::make(
            get: function () {
                return isset($this->json['start_time']) && isset($this->json['runtime_sec']);
            }
        );
    }

    protected function isStatusData(): Attribute
    {
        return Attribute::make(
            get: function () {
                return isset($this->json['modem']);
            }
        );
    }

    protected function startTime(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['start_time'] ?? null;
            }
        );
    }

    protected function stopTime(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['stop_time'] ?? null;
            }
        );
    }

    protected function runtimeSeconds(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['runtime_sec'] ?? null;
            }
        );
    }

    protected function runtimeMinutes(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['runtime_min'] ?? null;
            }
        );
    }

    protected function signalStrength(): Attribute
    {
        return Attribute::make(
            get: function () {
                $json = $this->json;

                // Modem format
                if (isset($json['modem']['rssi_dBm'])) {
                    return $json['modem']['rssi_dBm'];
                }

                // Cell format (fallback)
                if (isset($json['cell']) && is_array($json['cell']) && count($json['cell']) > 0) {
                    return $json['cell'][0]['strength'] ?? null;
                }

                return null;
            }
        );
    }

    protected function batteryVoltage(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['battery']['V'] ?? null;
            }
        );
    }

    protected function batterySoc(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['battery']['SoC'] ?? null;
            }
        );
    }

    protected function temperature(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['sht4x']['temp'] ?? $this->json['modem']['temp'] ?? null;
            }
        );
    }

    protected function humidity(): Attribute
    {
        return Attribute::make(
            get: function () {
                return $this->json['sht4x']['hum'] ?? null;
            }
        );
    }

    protected function deviceType(): Attribute
    {
        return Attribute::make(
            get: function () {
                if ($this->is_runtime_data) {
                    return 'runtime';
                }
                if ($this->is_status_data) {
                    return 'status';
                }
                return 'unknown';
            }
        );
    }
}
