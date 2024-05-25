
class Message {
    constructor(topic, token = undefined, to = undefined, content = undefined) {
        this.topic = topic;
        token ? this.token = token : undefined;
        to ? this.to = to : undefined;
        content ? this.content = content : undefined;
    }
}


export { Message }