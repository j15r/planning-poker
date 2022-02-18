import express = require("express");
import {Server, Socket} from "socket.io";
import {createServer} from "http";
import {v4 as uuidv4} from 'uuid';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:8080"
    }
});

const openSessions: Map<string, Socket> = new Map();

console.log('Starting planning poker backend');
httpServer.listen(3000);
console.log('Server listing on port 3000');

const corsOptions = {
    origin: 'http://localhost:8080',
}
app.use(cors(corsOptions));

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/session", (req, res) => {
    let sessionId: string = req.query.sessionId as string;
    const socketId: string = req.query.socketId as string;
    console.log(`sessionId: ${sessionId}`);
    console.log(`clientId: ${socketId}`);
    if (sessionId) {
        console.log(`Join to already existing session ${sessionId}`);
    } else {
        sessionId = uuidv4();
        console.log(`Create new session for client with socket.id: ${socketId} to room: ${sessionId}`);
    }

    const socket = openSessions.get(socketId);
    if (socket) {
        socket.join(sessionId);
        console.log(`Join client to room`);
        io.to(sessionId).emit("pp-info", {sessionId: sessionId});
    }
    console.log('return status code');
    return res.status(200);
});

io.on("connection", (socket) => {
    console.log(`New client connected with socket.id: ${socket.id}`);
    openSessions.set(socket.id, socket);
});

io.on("votings", (socket) => {
    console.log(`Received new voting: ${socket}`);
})

io.on("join", (socket) => {
    console.log(`socket.data: ${socket.data.sessionId}`);
    console.log(`New client connected with socket.id: ${socket.id}`);
})

