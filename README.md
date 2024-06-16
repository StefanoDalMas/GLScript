# GLScript
Project for Autonomous Software Agents course. The aim is to implement the BDI control loop for our agents and this is done via the API provided by [Deliveroo.js](https://github.com/unitn-ASA/DeliverooAgent.js) project.

## Running the project

In order to run the project firstly clone the repository and run ```npm install ``` to correctly install the dependencies

Firstly, create a config folder and 
then run the following commands and then create the tokens needed(either by downloading the Deliveroo.js project, or by using the online service [deliveroojs Onrender website](https://deliveroojs.onrender.com)).
```bash
mkdir config
cd config
touch config.js
```
In ```config.js``` folder insert something like this
```bash
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

// const local = new DeliverooApi(
//     "https://deliveroojs.onrender.com",
//     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImExM2UyYzIyZjk2IiwibmFtZSI6IkdMU2NyaXB0IiwiaWF0IjoxNzE1MTU4NDI4fQ.yA7H30puGnq59u8TMvr-WYD3eISuqBEYCqjm4GGSjkQ",
// );
```

Now, you can start the project by returning to the root and running the following commands
```
```bash
node src/main.js <master/slave> <pddl>(optional)
```
The first argument is used to discriminate among the Master agent and the Slave one(please note that in order to run both of them the slave command has to be runned beforehand).

The ```pddl``` flag discriminates if the agent is going to use astar or the pddl in order to be able to find paths. 
### Runnining PDDL locally

In order to run the PDDL solution locally, refer to [Planning as a Service](https://github.com/AI-Planning/planning-as-a-service) and follow the commands.

Then, you need to go to ```node_modules/@unitn-asa/pddl-client/src/PddlOnlineSolver.js```. Here you are going to change the parameters to the following:
```bash
const HOST = process.env.PAAS_HOST || 'http://localhost:5001';
const PATH = process.env.PAAS_PATH || '/package/optic/solve';
```
The first one lets the interface know that we are using the docker solution, whereas the second one decides which planner we areusing to solve. We have decided to "opt" for ```OPTIC``` planner as it was the most consistant one in our tests.
### Collaborators
- [Stefano Dal Mas](https://github.com/StefanoDalMas)
- [Lorenzo Dongili](https://github.com/dongi01)
