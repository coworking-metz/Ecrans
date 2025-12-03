/**
 * @module wsModule
 * @description WebSocket manager for interacting with the server.
 */

import { useRoute } from 'vue-router';

export const ws = (() => {

    let ws = null;
    let sti = null;
    const route = useRoute();

    return {

        connect() {

            // Prevent duplicated listener stacks
            if (ws) {
                try { ws.close(); } catch {}
            }

            ws = new WebSocket("wss://websocket.coworking-metz.fr/ws");

            // ----------- OPEN -------------
            ws.onopen = () => {
                console.log("[WS] connected");

                // 🔥 ONLY register once per connection
                ws.send(JSON.stringify({
                    action: "ecran",
                    slug: route.params.slug
                }));
            };

            // ----------- MESSAGES ----------
            ws.onmessage = (event) => {

                let eventData;

                try {
                    eventData = JSON.parse(event.data);
                } catch (e) {
                    console.log("[WS Raw]", event.data);
                    return;
                }

                // Keep your original logic
                // Server must send { payload:{...} }
                if (eventData.payload) {
                    const payload = eventData.payload;
                    window.bus.emit(payload.name, payload);
                    return;
                }

                // Fallback: emit generic events
                if (eventData.name) {
                    window.bus.emit(eventData.name, eventData);
                }
            };

            // ----------- ERROR -------------
            ws.onerror = (err) => {
                console.warn("[WS error]", err);
            };

            // ----------- CLOSE -------------
            ws.onclose = () => {

                // avoid reconnect on pages other than visionner
                if (!document.location.href.includes('visionner'))
                    return;

                // avoid infinite reconnect storms
                if (ws.readyState === WebSocket.OPEN) return;
                if (ws.readyState === WebSocket.CONNECTING) return;

                if (sti) clearTimeout(sti);

                // your original logic
                sti = setTimeout(() => {
                    document.location.reload();
                }, 3000);
            };
        },

        /**
         * Send raw payload
         */
        send(payload = {}) {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            payload.action = 'ecran';
            ws.send(JSON.stringify(payload));
        }
    };
})();
