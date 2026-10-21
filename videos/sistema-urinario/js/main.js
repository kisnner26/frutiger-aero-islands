import { UrinarySimulation } from './simulation.js';
import { bindUI } from './ui.js';

const root = document.querySelector('.app');
const simulation = new UrinarySimulation(root);
bindUI(root, simulation);
simulation.renderState();
