<template>
  <el-row>
    <el-col :span="24">
      <h1> Planning Poker </h1>
    </el-col>

    <el-col v-if="!activeSession" :span="24">
      <el-row>
        <el-col :span="6">
        </el-col>

        <el-col :span="12">
          <div>
            <div>
              <el-button @click="startSession">
                Start session
              </el-button>
            </div>
            <div>
              <el-input v-model="sessionId" placeholder="Please input"/>
              <el-button @click="joinSession(this.sessionId)" :disabled="!isValidUuid()">Join session</el-button>
            </div>
          </div>
        </el-col>

        <el-col :span="6">
        </el-col>
      </el-row>
    </el-col>

    <el-col :span="6">
    </el-col>

    <el-col v-if="!userParticipating && activeSession" :span="12">
      <div>
        <h2>Username:</h2>
        <input v-model="username" placeholder=""/>
        <el-button @click="joinSession(this.sessionId, true)">
          Join user
        </el-button>
      </div>
    </el-col>

    <el-col v-if="userParticipating" :span="12">
      <p>Planing Poker Session: {{ this.sessionId }}</p>
      <div>
        <el-button @click="clearVotes()">
          Clear votes
        </el-button>

        <el-button @click="showVotes()">
          Show votes
        </el-button>
      </div>

      <div>
        <p>final vote: {{ finalVote }}</p>
      </div>

      <el-row>
        <el-col :span="6">
          <el-button @click="vote('0')">
            0 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('0.5')">
            0.5 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('1')">
            1 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('2')">
            2 points
          </el-button>
        </el-col>
      </el-row>

      <el-row>
        <el-col :span="6">
          <el-button @click="vote('3')">
            3 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('5')">
            5 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('8')">
            8 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('13')">
            13 points
          </el-button>
        </el-col>
      </el-row>

      <el-row>
        <el-col :span="6">
          <el-button @click="vote('20')">
            20 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('40')">
            40 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('100')">
            100 points
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="vote('?')">
            ? points
          </el-button>
        </el-col>
      </el-row>

      <el-scrollbar>
        <div v-for="user in users" :key="user" class="scrollbar-demo-item">
          <el-container class="justify-content: space-between;">
            <el-row>
              <el-col>
                <div class="display: inline-block;">
                  <p>{{ user.username }}</p>
                  <p v-if="showResults">{{ user.currentVote }}</p>
                </div>
              </el-col>
            </el-row>
          </el-container>
        </div>
      </el-scrollbar>
    </el-col>

    <el-col :span="6">
    </el-col>
  </el-row>
</template>

<script lang="ts">
import {Options, Vue} from 'vue-class-component';
import {io} from "socket.io-client";
import axios from "axios";

@Options({
  props: {
    msg: String
  },
  data() {
    return {
      users: [],
      id: "",
      username: "",
      showResults: false,
      activeSession: false,
      userParticipating: false,
      sessionId: '',
      currentVote: '',
      finalVote: 0,
      socket: null
    }
  },
  methods: {
    // todo: leave session on window close
    startSession(): void {
      console.log('Starting new session for user');

      this.socket = io("http://localhost:3000")

      this.socket.on("connect", () => {
        console.log(`Socket id: ${this.socket.id}`);

        // register user or join exiting room
        try {
          if (this.sessionId) {
            // join existing room
            console.log(`Join existing session: ${this.sessionId}`)
            axios.post(`http://localhost:3000/session?sessionId=${this.sessionId}&socketId=${this.socket.id}&username=${this.username}`).then(() => {
              this.activeSession = true;
            }).catch((err) => {
              console.log(err);
            });
          } else {
            console.log(`Create new session`);
            axios.post(`http://localhost:3000/session?socketId=${this.socket.id}`).then(() => {
              this.activeSession = true;
            }).catch((err) => {
              console.error(err);
            });
          }
        } catch (err) {
          console.error(err);
        }
      });

      this.socket.on("pp-info", (data: any) => {
        console.log(`Retrieved pp-info message from server`, data);
        if (data.sessionId) {
          this.sessionId = data.sessionId;
        }
      });

      this.socket.on("user-joined", (data: { players: [{ sessionId: string, username: string, id: string, currentVote: string }] }) => {
        console.log(`Retrieved server message that user joined`);
        this.users = [];

        for (const playerData of data.players) {
          // check when receiving own user object
          if (playerData.username === this.username) {
            this.id = playerData.id;
          }

          this.users.push({
            id: playerData.id,
            username: playerData.username,
            sessionId: playerData.sessionId,
            currentVote: playerData.currentVote
          });
        }
        console.log('user-joined: this.users', JSON.stringify(this.users));
      });

      this.socket.on("user-voted", (data: { players: [{ sessionId: string, username: string, id: string, currentVote: string }] }) => {
        console.log(`Retrieved server message that another user voted`, data);
        this.users = [];
        for (const playerData of data.players) {
          this.users.push({
            id: playerData.id,
            username: playerData.username,
            sessionId: playerData.sessionId,
            currentVote: playerData.currentVote
          });
        }
      });

      this.socket.on("clear-votes", (data: [{ sessionId: string, username: string, id: string, currentVote: string }]) => {
        console.log(`Retrieved server message to clear votes`);
        this.showResults = false;
        this.users = [];
        for (const playerData of data) {
          this.users.push({
            id: playerData.id,
            username: playerData.username,
            sessionId: playerData.sessionId,
            currentVote: playerData.currentVote
          });
        }
      });

      this.socket.on("show-votes", (data: any) => {
        console.log(`Retrieved server message to show votes: ${JSON.stringify(data)}`);
        this.showResults = true;
        this.finalVote = data;
      });

      this.socket.on("disconnect", () => {
        console.log(this.socket.id); // undefined
      });
    },
    vote(voting: string) {
      console.log(`Vote changed to: ${voting}`);
      this.currentVote = voting;
      if (this.socket) {
        this.socket.emit("votings", {
          voting: this.currentVote,
          username: this.username,
          sessionId: this.sessionId,
          id: this.id
        });
      }
    },
    joinSession(sessionId: string, userParticipating?: boolean) {
      console.log(`Join user to session with sessionId: ${sessionId}, userParticipating: ${userParticipating}`);
      this.startSession(sessionId);
      if (typeof userParticipating !== "undefined") {
        this.userParticipating = true;
        this.socket.emit("join", {
          sessionId: sessionId,
          username: this.username
        });
      }
    },
    clearVotes() {
      this.socket.emit("clear-votes", {
        sessionId: this.sessionId,
        username: this.username
      });
    },
    showVotes() {
      this.socket.emit("show-votes", {
        sessionId: this.sessionId,
        username: this.username
      });
    },
    isValidUuid(): boolean {
      const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
      console.log('check sessionid:', this.sessionId, 'valid?:', regexExp.test(this.sessionId));
      return regexExp.test(this.sessionId);
    }
  }
})
export default class LandingPage extends Vue {
}
</script>

<style scoped>
.scrollbar-demo-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  margin: 10px;
  text-align: center;
  border-radius: 4px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
