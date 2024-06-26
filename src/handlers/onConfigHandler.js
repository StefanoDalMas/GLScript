import { consts } from '../classes/consts.js'

async function onConfigHander(config) {
    console.log("config", config)
    consts.CLOCK = config.CLOCK
    consts.MOVEMENT_STEPS = config.MOVEMENT_STEPS
    consts.MOVEMENT_DURATION = config.MOVEMENT_DURATION
    consts.PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL
    console.log("decaying?", consts.decayingActive())
}

export { onConfigHander }