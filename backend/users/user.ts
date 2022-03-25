import {v4 as uuidv4} from "uuid";

export class User {
    id: string;
    username: string;
    sessionId: string;
    currentVoting: string;

    constructor(username: string, sessionId: string) {
        this.id = uuidv4();
        this.username = username;
        this.sessionId = sessionId;
        this.currentVoting = "";
    }
}