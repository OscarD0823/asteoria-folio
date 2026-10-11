export const proofingLanguages = [
 {id:'es',locale:'es-ES',label:'Español',package:'dictionary-es'},
 {id:'es-CO',locale:'es-CO',label:'Español · Colombia',package:'dictionary-es-co'},
 {id:'en',locale:'en-US',label:'English · Estados Unidos',package:'dictionary-en'},
 {id:'en-GB',locale:'en-GB',label:'English · Reino Unido',package:'dictionary-en-gb'},
 {id:'fr',locale:'fr-FR',label:'Français',package:'dictionary-fr'},
 {id:'pt',locale:'pt-BR',label:'Português · Brasil',package:'dictionary-pt'},
 {id:'pt-PT',locale:'pt-PT',label:'Português · Portugal',package:'dictionary-pt-pt'},
 {id:'de',locale:'de-DE',label:'Deutsch',package:'dictionary-de'},
 {id:'it',locale:'it-IT',label:'Italiano',package:'dictionary-it'},
 {id:'nl',locale:'nl-NL',label:'Nederlands',package:'dictionary-nl'},
 {id:'ca',locale:'ca-ES',label:'Català',package:'dictionary-ca'},
] as const;
export type ProofingLanguage=typeof proofingLanguages[number]['id'];
export function proofingLanguage(value:unknown){return proofingLanguages.find(l=>l.id===value||l.locale===value)??proofingLanguages[0];}
export function textWords(text:string){
 const masked=text.replace(/(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[\p{L}]+/gu,m=>' '.repeat(m.length));
 return Array.from(masked.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)).filter(m=>m[0].length>=2&&m[0].length<=64).map(m=>({word:m[0],from:m.index!,to:m.index!+m[0].length}));
}
