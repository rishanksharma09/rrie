import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

/**
 * Calculates ETA between two points using Mapbox Directions API.
 * @param {Array<number>} source - [lng, lat]
 * @param {Array<number>} destination - [lng, lat]
 * @returns {Promise<{duration: number, distance: number, etaText: string}>}
 */
export const calculateETA = async (source, destination) => {
    if (!MAPBOX_TOKEN) {
        console.warn('[Mapbox] No access token provided.');
        return { duration: 0, distance: 0, etaText: 'N/A' };
    }

    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${source[0]},${source[1]};${destination[0]},${destination[1]}?access_token=${MAPBOX_TOKEN}`;
        const response = await axios.get(url);

        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            const durationInMinutes = Math.ceil(route.duration / 60);
            const distanceInKm = (route.distance / 1000).toFixed(1);

            return {
                duration: route.duration,
                distance: parseFloat(distanceInKm),
                etaText: `${durationInMinutes} mins`
            };
        }

        return { duration: 0, distance: 0, etaText: 'N/A' };
    } catch (error) {
        console.error('[Mapbox] Error calculating ETA:', error.response?.data || error.message);
        return { duration: 0, distance: 0, etaText: 'Error' };
    }
};
