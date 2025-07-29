// types/vibetrack.ts

export interface CellData {
    id: number;
    mcc: number;
    mnc: number;
    type: string;
    strength: number;
}

export interface ModemData {
    lac: string;
    mfw: string;
    band: string;
    temp: number;
    time: string;
    cellid: string;
    hw_ver: string;
    batt_mV: number;
    msg_ver: number;
    lte_mode: string;
    operator: string;
    rssi_dBm: number;
    curr_mode: string;
    device_id: string;
    rst_reason: number;
}

export interface SensorData {
    hum: number;
    temp: number;
}

export interface BatteryData {
    I: number;
    V: number;
    SoC: number;
    tte: number;
}

export interface VibetrackJsonFormat1 {
    cell: CellData[];
}

export interface VibetrackJsonFormat2 {
    modem: ModemData;
    sht4x: SensorData;
    battery: BatteryData;
}

export type VibetrackJson = VibetrackJsonFormat1 | VibetrackJsonFormat2;

export interface Vibetrack {
    id: number;
    cell_identifier: string | null;
    signal_strength: number | null;
    device_type: 'cell' | 'modem' | 'unknown';
    json: VibetrackJson;
    created_at: string;
    updated_at: string;
}

export interface VibetrackFilters {
    cell_id?: string;
    date_from?: string;
    date_to?: string;
    device_type?: 'cell' | 'modem';
}

export interface PaginatedVibetracks {
    data: Vibetrack[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}
