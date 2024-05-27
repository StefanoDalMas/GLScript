

async function onYouHandler(id, name, x, y, score, beliefs) {
    beliefs.me.id = id
    beliefs.me.name = name
    beliefs.me.x = Math.round(x)
    beliefs.me.y = Math.round(y)
    beliefs.me.score = score
}

export { onYouHandler }