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

// stores all player data
const playerData = new Map();

app.post("/session", (req, res) => {
    let sessionId: string = req.query.sessionId as string;
    const socketId: string = req.query.socketId as string;
    const username: string = req.query?.username as string;
    console.log(`sessionId: ${sessionId}`);
    console.log(`clientId: ${socketId}`);
    if (sessionId) {
        console.log(`Join to already existing session ${sessionId}`);
    } else {
        sessionId = uuidv4();
        playerData.set(sessionId, {players: []});
        console.log(`Create new session for client with socket.id: ${socketId} to room: ${sessionId}`);
    }

    const socket = openSessions.get(socketId);
    if (socket) {
        if (username) {
            // @ts-ignore
            socket["username"] = username;
        }
        socket.join(sessionId);
        console.log(`Join client to room`);
        io.to(sessionId).emit("pp-info", {sessionId: sessionId});
    }
    console.log('return status code');
    return res.status(200).send();
});

io.on("connection", (socket) => {
    console.log(`New client connected with socket.id: ${socket.id}`);
    openSessions.set(socket.id, socket);

    socket.on("votings", (votingData: { voting: number, sessionId: string, username: string, id: string }) => {
        console.log(`Received new voting: ${JSON.stringify(votingData)}`);

        const data = playerData.get(votingData.sessionId);
        data.players.find((d: any) => {
            return d.id === votingData.id
        }).currentVote = votingData.voting;
        playerData.set(votingData.sessionId, data);
        console.log('--------  current player data --------')
        playerData.forEach((value: boolean, key: string) => {
            console.log(key, value);
        });

        io.sockets.emit('user-voted', data);
    })

    socket.on("join", (socket: { username: string, sessionId: string }) => {
        const username = socket.username;
        const sessionId = socket.sessionId;
        const user = new User(username, sessionId);
        console.log(`socket.data: ${socket.sessionId}, username: ${socket.username}`);
        console.log(`New client connected with socket.id: ${socket.sessionId} and username ${socket.username}`);

        if (!playerData.get(sessionId)) {
            console.error('could not find planning poker session with given id');
        }

        const player = {
            sessionId: user.sessionId,
            username: user.username,
            id: user.id,
            currentVote: ''
        }

        // to-do: check for duplicates
        const data = playerData.get(sessionId);
        console.log(`current playerData: ${JSON.stringify(data)}`);
        data.players.push(player);
        console.log('data', JSON.stringify(data));
        playerData.set(sessionId, data);
        console.log('--------  current player data --------')
        playerData.forEach((value: boolean, key: string) => {
            console.log(key, value);
        });

        io.to(socket.sessionId).emit("user-joined", data);
    })

    io.on('disconnect', () => {
        socket.removeAllListeners();
    });
});

class User {
    id: string;
    username: string;
    sessionId: string;

    constructor(username: string, sessionId: string) {
        this.id = uuidv4();
        this.username = username;
        this.sessionId = sessionId;
    }
}