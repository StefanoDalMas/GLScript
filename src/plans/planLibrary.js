import { GoPickUp } from "./goPickUp.js";
import { GoPutDown } from "./goPutDown.js";
import { GoTo } from "./goTo.js";
import { RandomMove } from "./randomMove.js";
import { initializePlans } from "./sharedPlans.js";

const planLibrary = initializePlans();

export { planLibrary };

export const setPlans = (plans) => {
    planLibrary.GoPickUp = plans.GoPickUp;
    planLibrary.GoPutDown = plans.GoPutDown;
    planLibrary.GoTo = plans.GoTo;
    planLibrary.RandomMove = plans.RandomMove;
};