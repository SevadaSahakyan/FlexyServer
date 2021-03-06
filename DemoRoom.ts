import { Room, Client, generateId } from "colyseus";
import { Schema, type } from "@colyseus/schema";
import { State } from "./State";
import { Entity } from "./Entity";

class MovementMessage extends Schema {
  @type("uint32") stateNum;
  @type("number") x;
  @type("number") y;
  @type("number") z;
  @type("string") msg;
}

class Message {
  command: string;
  data: any;
}

export class DemoRoom extends Room<State> {
  onCreate () {
    console.log("DemoRoom created!");

    this.setState(new State());
    this.setSimulationInterval(() => this.state.update(16.6));
    this.setPatchRate(1000 / 1000);
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    this.state.createUser(client.sessionId);
  }

  onMessage (client: Client, message: Message) {
    const entity = this.state.entities[client.sessionId];

    // skip dead players
    if (!entity || entity.health <= 0) {
      console.log("DEAD PLAYER ACTING...");
      return;
    }

    switch(message.command){
      case "movement":
          console.log(message.command, message.data, "received from", client.sessionId);
    
          this.state.entities[client.sessionId].x = message.data.x;
          this.state.entities[client.sessionId].y = message.data.y;
          this.state.entities[client.sessionId].z = message.data.z;
      
          const movementMessage: MovementMessage = message.data;
          movementMessage.msg = "Approved";
          message.data = movementMessage;

          this.send(client, message);
      
          console.log("x: %s y: %s z: %s", 
                      this.state.entities[client.sessionId].x,
                      this.state.entities[client.sessionId].y, 
                      this.state.entities[client.sessionId].z);

        break;

      case "create_projectile":
        this.state.createProjectile(message.data, client.sessionId);
        break;
    }
  }

  async onLeave (client: Client, consented: boolean) {
    this.state.entities[client.sessionId].connected = false;

    try {
      if (consented) {
        throw new Error("consented leave!");
      }

      console.log("let's wait for reconnection!")
      const newClient = await this.allowReconnection(client, 10);
      console.log("reconnected!", newClient.sessionId);

    } catch (e) {
      console.log("disconnected!", client.sessionId);
      delete this.state.entities[client.sessionId];
    }
  }

  onDispose () {
    console.log("disposing DemoRoom...");
  }
}