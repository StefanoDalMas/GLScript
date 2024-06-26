import { consts } from "../classes/consts.js";


class Parcel {
    constructor(parcel) {
        this.id = parcel.id;
        this.x = Math.round(parcel.x);
        this.y = Math.round(parcel.y);
        this.carriedBy = parcel.carriedBy;
        this.reward = parcel.reward;
        this.timestamp = Date.now();
        this.probability = 1;
    }
    rewardAfterNSteps(steps) {
        if (steps === 0) {
            return this.reward;
        }
        if (!consts.decayingActive()) {
            return this.reward;
        }
        let secondsPassing = (steps / consts.MOVEMENT_STEPS) * (consts.MOVEMENT_DURATION / 1000);
        switch (consts.PARCEL_DECADING_INTERVAL) {
            case "1s":
                return this.reward - Math.round(secondsPassing);
            case "2s":
                return this.reward - Math.round(secondsPassing / 2);
            case "5s":
                return this.reward - Math.round(secondsPassing / 5);
            case "10s":
                return this.reward - Math.round(secondsPassing / 10);
            case "infinite":
                return this.reward;
        }
    }

    rewardAfterNSeconds(seconds) {
        if (seconds === 0) {
            return this.reward;
        }
        if (!consts.decayingActive()) {
            return this.reward;
        }
        switch (consts.PARCEL_DECADING_INTERVAL) {
            case "1s":
                return this.reward - Math.round(seconds);
            case "2s":
                return this.reward - Math.round(seconds / 2);
            case "5s":
                return this.reward - Math.round(seconds / 5);
            case "10s":
                return this.reward - Math.round(seconds / 10);
            case "infinite":
                return this.reward
        }
    }


    getLocation() {
        return { x: this.x, y: this.y };
    }

    intoPredicate(intention) {
        return [intention, this.x, this.y, this.id];
    }

}


export { Parcel }