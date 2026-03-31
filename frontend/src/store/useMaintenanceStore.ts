import { create } from "zustand";
import { io } from "socket.io-client";

interface MaintenanceState {
    isMaintenance: boolean;
    setIsMaintenance: (isMaintenance: boolean) => void;
}

// Socket instance for maintenance alerts
const socket = io(import.meta.env.VITE_BACKEND_URL);

export const useMaintenanceStore = create<MaintenanceState>((set) => {
    // Listen for server shutdown event to trigger maintenance mode
    socket.on('serverShutdown', () => {
        set({ isMaintenance: true });
    });


    socket.on('connect', () => {
        set({ isMaintenance: false });
    });

    return {
        isMaintenance: false,
        setIsMaintenance: (isMaintenance) => set({ isMaintenance }),
    };
});
