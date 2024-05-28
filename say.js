import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import { Message } from './src/classes/message.js';

const client = new DeliverooApi(
    "http://localhost:8080",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNlMjlmNDAxOTYyIiwibmFtZSI6ImdvZCIsImlhdCI6MTcxNjgyNDIwMn0.X9EMmLO_dKRO-BDzPni5j9XFLrwoQdSR_xMVquBNqvQ",
);
await new Promise((res) => client.onYou(res));
let token = '41b73517-a425-4cd5-ad5e-6bb855cbd6cf';
await client.say("3c09787b0d7", new Message("ALLYGLS?", token));

process.exit();


