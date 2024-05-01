import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
// import {client, deliverooclient} from "./config.js"
// const clients = require("./config.js")
import { remote, local } from "../config/config.js"

const client = local
// client = remote

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2));
    const dy = Math.abs(Math.round(y1) - Math.round(y2));
    return dx + dy;
}

/**
 * @type {Map<x,Map<y,{x,y,delivery}>}
 */
const map = new Map();

const me = {};

await new Promise((res) => {
    client.onYou(({ id, name, x, y, score }) => {
        me.id = id;
        me.name = name;
        me.x = x;
        me.y = y;
        me.score = score;
        console.log("me:", me.x, me.y);
        res();
    });
});

//test from CLI
// const target = { x: process.argv[2], y: process.argv[3] };
// if (target.x || target.y) {
//     console.log("go from", me.x, me.y, "to", target.x, target.y);
// }

//Delivery stuff
let delivery_db = [];
client.onTile((x, y, delivery) => {
    if (delivery) {
        delivery_db.push({ x, y });
    }
});

client.onParcelsSensing(async (parcels) => {
    // let carrying = false;
    Array.from(parcels).map((p) => {
        if (me.x < p.x) {
            client.move("right");
        } else if (me.x > p.x) {
            client.move("left");
        }
        if (me.y < p.y) {
            client.move("up");
        } else if (me.y > p.y) {
            client.move("down");
        }
        console.log("moved");
        if (me.x == p.x && me.y == p.y) {
            console.log("picked up!");
            client.pickup();
            // carrying = true;
        }
    });
    console.log(delivery_db);
    // if (carrying == true) {
    //     while (me.x != 0 && me.y != 0) {
    //         client.move("left");
    //         client.move("down");
    //     }
    //     carrying = false;
    // }
});

//TODO:
// ora il mongolo prende i pacchetti, bisogna farli consegnare
// per farlo ho un delivery_db che mi dice quali sono le celle delivery
// guarda la onTile che è marcia