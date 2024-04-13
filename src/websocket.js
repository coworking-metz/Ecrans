/**
 * @module wsModule
 * @description This module provides WebSocket connection management for interacting with a specific server.
 * It includes methods to connect to the server, send data, and handle incoming messages, closures, and opening of the WebSocket.
 */

import { useRoute } from 'vue-router';

export const ws = (() => {
    /**
     * @private
     * @type {WebSocket}
     * @description The WebSocket object that manages the connection.
     */
    let ws;

    /**
     * @private
     * @type {number}
     * @description The timeout identifier used to handle reconnection.
     */
    let sti;

    return {
        /**
         * @function connect
         * @description Establishes a WebSocket connection to the server, sets up event handlers for the socket events like message, close, and open.
         */
        connect() {
            ws = new WebSocket("wss://websocket.coworking-metz.fr/ws");

            ws.onmessage =  (event) => {
                try {
                    const eventData = JSON.parse(event.data);
                    const payload = eventData.payload;
                    window.bus.emit(payload.name, payload);
                } catch (e) {
                    console.log(event.data)
                }
            };

            ws.onclose = () => {
                if(!document.location.href.includes('visionner')) return;
                if(ws.readyState == WebSocket.OPEN) return
                if(ws.readyState == WebSocket.CONNECTING) return
                if(sti) {
                    clearTimeout(sti);
                }
                sti = setTimeout(() => {
                    document.location.reload();
                }, 3000);
            };
            ws.onopen =  () => {
                this.send();                
                console.log('WebSocket connection established');
            };
        },

        /**
         * @function send
         * @description Sends data through the WebSocket connection after adding a specific action to the payload.
         * @param {Object} payload - The data to be sent through the WebSocket.
         * @returns {void}
         */
        send(payload={}) {
            payload.action = 'ecran';
            return ws.send(JSON.stringify(payload));
        }
    };
})();
