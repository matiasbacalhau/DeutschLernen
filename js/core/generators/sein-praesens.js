// Generador de huecos de *sein* en presente: una instancia por sujeto. Los sujetos evitan *sie*/*Sie* sueltos al
// comienzo de la frase, que serían ambiguos (ella, ellos o usted: dos respuestas posibles).
export const SEIN = {ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind'};
const SUBJECTS = [
  {de: 'Ich', person: 'ich'}, {de: 'Du', person: 'du'}, {de: 'Tom', person: 'er'},
  {de: 'Wir', person: 'wir'}, {de: 'Ihr', person: 'ihr'}, {de: 'Tom und Lea', person: 'sie'},
];

export function instances(template) {
  return SUBJECTS.map(s => ({
    id: `${template.id}:${s.person}`,
    type: 'gap',
    tag: template.tag_prefix,
    context: template.context,
    text: template.text.replace('{subject}', s.de),
    answers: [SEIN[s.person]],
    dims: {person: s.person},
    generated: true,
  }));
}
