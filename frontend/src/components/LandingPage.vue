<template>
  <div class="hello">
    <h1>Planning Poker</h1>
    <div v-if="!activeSession">
      <button @click="startSession">
        Start session
      </button>

      <input v-model="sessionId" placeholder=""/>
      <button @click="joinSession(this.sessionId)" :disabled="!sessionId">
        Join session
      </button>
    </div>

    <div v-if="!userParticipating && activeSession">
      <span>Username:</span>
      <input v-model="username" placeholder=""/>
      <button @click="joinUser">
        Join session
      </button>
    </div>

    <div v-if="userParticipating">
      <p>Planing Poker Session: {{ this.sessionId }}</p>
      <div>
      <button @click="clearVotes()">
        Clear votes
      </button>

      <button @click="showVotes()">
        Show votes
      </button>
      </div>

      <li v-for="v in votes">
        <button @click="vote(v)">
          {{ v }} points
        </button>
      </li>

      <div>
        <b>User</b>
        <ul>
          <li v-for="user in users">
            {{ user.name }} - {{ currentVote }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {Options, Vue} from 'vue-class-component';
import {io, Socket} from "socket.io-client";
import axios from "axios";

@Options({
  props: {
    msg: String
  },
  data() {
    return {
      users: [],
      username: "",
      activeSession: false,
      userParticipating: false,
      votes: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?'],
      sessionId: '',
      currentVote: '',
      socket: null
    }
  },
  methods: {
    // todo: leave session on window close
    startSession() {
      console.log('Starting new session for user');

      this.socket = io("http://localhost:3000")

      this.socket.on("connect", () => {
        console.log(`Created planning poker session`);
        console.log(`Socket id: ${this.socket.id}`);

        // register user or join exiting room
        let res
        try {
          if (this.sessionId) {
            // join existing room
            console.log(`Join existing session: ${this.sessionId}`)
            axios.post(`http://localhost:3000/session?sessionId=${this.sessionId}&socketId=${this.socket.id}&username=${this.username}`).then((response) => {
              console.log('set activeSession to true', response);
              this.activeSession = true;
            }).catch((err) => {
              console.log(err);
            });
          } else {
            console.log(`Create new session`);
            axios.post(`http://localhost:3000/session?socketId=${this.socket.id}`).then((response) => {
              console.log('set activeSession to true', response);
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
        console.log(`Retrieved pp-info message from server`, data.sessionId);
        if (data.sessionId) {
          this.sessionId = data.sessionId;
        }
      });

      this.socket.on("user-joined", (data: any) => {
        console.log(`Retrieved server message that another user joined`, data);
      });

      this.socket.on("user-voted", (data: any) => {
        console.log(`Retrieved server message that another user joined`, data);
      });

      this.socket.on("clear-votes", () => {
        console.log(`Retrieved server message to clear votes`);
      });

      this.socket.on("show-votes", (data: any) => {
        console.log(`Retrieved server message to clear votes`);
      });

      this.socket.on("disconnect", () => {
        console.log(this.socket.id); // undefined
      });
    },
    vote(voting: string) {
      console.log(`Vote changed to: ${voting}`);
      this.currentVote = voting;
      if (this.socket) {
        this.socket.emit("votings", {voting: this.currentVote, username: this.username, sessionId: this.sessionId});
      }
    },
    joinUser() {
      this.userParticipating = true;
      console.log(`User with name ${this.username} joins session`);
      this.users.push({name: this.username});
    },
    joinSession(sessionId: string) {
      console.log('User joined session');
      this.startSession(sessionId);
    },
    clearVotes() {
      console.log('clear votes');
    },
    showVotes() {
      console.log('show votes');
    }
  }
})
export default class LandingPage extends Vue {
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
