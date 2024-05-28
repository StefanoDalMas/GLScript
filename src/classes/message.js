
class Message {
    constructor(topic, token = undefined, content = undefined) {
        this.topic = topic;
        token ? this.token = token : undefined;
        content ? this.content = content : undefined;
    }
}


export { Message }