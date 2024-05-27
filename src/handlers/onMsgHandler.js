import { Message } from '../classes/message.js';

async function onMsgHandler(id, name, msg, callbackResponse, isMaster, allyList, deliverooApi, secretToken) {
    console.log("received message from ", id, " with content: ", msg)
    if (!isMaster) {
        if (msg.topic == "ALLYGLS?") {
            console.log("GIELLESSE SRL found an ally!");
            allyList.add(id);
            await deliverooApi.say(id, new Message("ALLYGLS!", secretToken, id, "I'm the slave! :)"));
        }
    } else {
        if (msg.topic == "ALLYGLS!") {
            console.log("GIELLESSE SRL found an ally!");
            allyList.add(id);
            await deliverooApi.say(id, new Message("ALLYGLS!", secretToken, id, "I'm the master! :)"));
        }
    }
    if (msg.topic == "CollaborationDelivery") {
        console.log("collaboration delivery started");
        //push custom plan with goTo -> MAX PRIORITY
    }
}

export { onMsgHandler }