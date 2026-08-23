import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
export declare function initSocket(httpServer: HttpServer): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function getIO(): Server;
