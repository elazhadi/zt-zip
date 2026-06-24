/**
 * Point d'entrée ESM — fine couche de ré-export au-dessus de la source CJS
 * (index.js). Source de vérité unique : index.js. Utilisé par les bundlers
 * (Vite/frontend) qui résolvent la condition d'export "import".
 */
import API from "./index.js";

export default API;

export const debiterChantier = API.debiterChantier;
export const debiterChassis = API.debiterChassis;
export const vitrageChassis = API.vitrageChassis;
export const accessoiresChassis = API.accessoiresChassis;
export const aggregateAccessoires = API.aggregateAccessoires;
export const optimiser = API.optimiser;
export const listeGammes = API.listeGammes;
export const getGamme = API.getGamme;
export const registerGamme = API.registerGamme;
export const ABAQUE = API.ABAQUE;
export const BARRE_LEN = API.BARRE_LEN;
export const BARRE_LEN_MONT = API.BARRE_LEN_MONT;
export const KERF = API.KERF;
export const refSort = API.refSort;
