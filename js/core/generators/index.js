// Instancias de una plantilla según su generador (`kind`); sin `kind`, la plantilla es de artículos.
import { instances as articuloCaso } from './articulo-caso.js';
import { instances as seinPraesens } from './sein-praesens.js';

export const instancesOf = (template, lexicon) => (template.kind === 'sein' ? seinPraesens(template) : articuloCaso(template, lexicon));
