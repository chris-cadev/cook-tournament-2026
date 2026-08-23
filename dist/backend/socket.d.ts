import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export declare function setupSocketIO(httpServer: HttpServer): Server;
