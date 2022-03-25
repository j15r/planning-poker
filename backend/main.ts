import express = require("express");
import {Server, Socket} from "socket.io";
import {createServer} from "http";
import {v4 as uuidv4} from 'uuid';
import cors from 'cors';
import {User} from "./users/user";
import {PlayerSocket} from "./socket/socket";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:8080"
    }
});

console.log('Starting planning poker backend');
httpServer.listen(3000);
console.log('Server listing on port 3000');

const corsOptions = {
    origin: 'http://localhost:8080',
}
app.use(cors(corsOptions));

// stores all player data
const playerData = new Map();
// open sessions
const openSessions: Map<string, PlayerSocket> = new Map();

app.get("/", (req, res) => {
});

app.post("/session", (req, res) => {
    let sessionId: string = req.query.sessionId as string;
    const socketId: string = req.query.socketId as string;
    const username: string = req.query?.username as string;
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
            socket.username = username;
        }
        socket.join(sessionId);
        io.to(sessionId).emit("pp-info", {sessionId: sessionId});
    }
    return res.status(200).send();
});

io.on("connection", (socket: Socket) => {
    console.log(`New client connected with socket.id: ${socket.id}`);
    openSessions.set(socket.id, <PlayerSocket>socket);

    socket.on("votings", (votingData: { voting: number, sessionId: string, username: string, id: string }) => {
        console.log(`Received new voting: ${JSON.stringify(votingData)}`);

        const data = playerData.get(votingData.sessionId);
        if (data) {
            data.players.find((playerData: { voting: number, sessionId: string, username: string, id: string }) => {
                return playerData.id === votingData.id
            }).currentVote = votingData.voting;
            playerData.set(votingData.sessionId, data);
            playerData.forEach((value: boolean, key: string) => {
                console.log(key, value);
            });

            io.sockets.emit('user-voted', data);
        } else {
            console.log(`Could not find data of session with id: ${votingData.sessionId}`);
        }
    })

    /**
     * Handle show-votes events from clients
     */
    socket.on("show-votes", (data: { sessionId: string, username: string }) => {
        console.log(`Received show-votes request from user ${data.username} with ${data.sessionId}`);
        const sessionData = playerData.get(data.sessionId);
        if (sessionData && sessionData.players) {
            let finalVote = 0;
            let playersWithoutVote = 0;
            for (const playerData of sessionData.players) {
                if (playerData.currentVote !== '?' || playerData.currentVote !== '') {
                    finalVote += Number(playerData.currentVote);
                } else {
                    playersWithoutVote++;
                }
            }
            if ((sessionData.players.length - playersWithoutVote) === 0) {
                io.sockets.emit('show-votes', '?');
            } else {
                finalVote = finalVote / (sessionData.players.length - playersWithoutVote);
                io.sockets.emit('show-votes', finalVote);
            }
        }
    })

    /**
     * Handle clear-votes events from clients
     */
    socket.on("clear-votes", (data: { sessionId: string, username: string }) => {
        console.log(`Received clear-votes request from user ${data.username} with ${data.sessionId}`);
        const sessionData = playerData.get(data.sessionId);
        if (sessionData && sessionData.players) {
            const newSessionData = [];
            for (const playerData of sessionData.players) {
                newSessionData.push({
                    id: playerData.id,
                    username: playerData.username,
                    sessionId: playerData.sessionId,
                    currentVote: ''
                });
            }
            playerData.set(data.sessionId, newSessionData);
            io.sockets.emit('clear-votes', newSessionData);
        }
    })

    socket.on("join", (socket: { username: string, sessionId: string }) => {
        const username = socket.username;
        const sessionId = socket.sessionId;
        const user = new User(username, sessionId);
        console.log(`New client connected with socket.id: ${socket.sessionId} and username ${socket.username}`);

        const player = {
            sessionId: user.sessionId,
            username: user.username,
            id: user.id,
            currentVote: ''
        }

        // todo: check for duplicates
        const data = playerData.get(sessionId);
        if (data) {
            data.players.push(player);
            playerData.set(sessionId, data);
            playerData.forEach((value: boolean, key: string) => {
                console.log(key, value);
            });

            io.to(socket.sessionId).emit("user-joined", data);
        } else {
            console.log(`Could not find session with id: ${sessionId}`);
        }
    })

    io.on('disconnect', () => {
        socket.removeAllListeners();
    });
});
