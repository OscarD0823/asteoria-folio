import * as engine from './prisma-presentation';
import {creationTemplate} from './template-catalog';
const E=914400;
export const presentationDesigns=[
 {id:'prisma',name:'Prisma',accent:'#6254c8',background:'#ffffff',text:'#293246'},
 {id:'ocean',name:'Océano',accent:'#147d80',background:'#f2faf9',text:'#214348'},
 {id:'ink',name:'Tinta',accent:'#bdafe9',background:'#24213c',text:'#ffffff'},
 {id:'sand',name:'Arena',accent:'#a46b39',background:'#fcf7ef',text:'#514235'},
 {id:'blue',name:'Editorial',accent:'#386b9a',background:'#f6f8fd',text:'#2b3b50'},
];
function box(slide:any,text:string,x:number,y:number,w:number,h:number,size:number,color:string,bold=false){engine.addElement(slide,{kind:'textbox',offset:{x:x*E,y:y*E,cx:w*E,cy:h*E},paragraphs:text.split('\n').map(line=>({runs:[{text:line,fontFamily:'Carlito',fontSize:size,color,bold}]}))});}
function rect(slide:any,x:number,y:number,w:number,h:number,color:string){engine.addElement(slide,{kind:'rect',offset:{x:x*E,y:y*E,cx:w*E,cy:h*E},fillColor:color});}
export function buildPresentationTemplate(opened:any,id:string){
 creationTemplate('slides',id);if(id==='blank')return opened;
 const palette=presentationDesigns.find(d=>d.id===(id==='lesson'?'ocean':id==='portfolio'?'sand':id==='report'?'blue':'prisma'))!;
 const topics:Record<string,string[]>={pitch:['Tu propuesta','La oportunidad','Próximos pasos'],lesson:['Tema de la clase','Conceptos principales','Ponlo en práctica'],report:['Informe de resultados','Resultados principales','Conclusiones'],portfolio:['Tu nombre y profesión','Proyectos seleccionados','Contacto']};
 const bodies:Record<string,string[]>={pitch:['Nombre del proyecto\nAutor · Fecha','Describe la necesidad y la solución propuesta.','Define responsables, fechas y acciones.'],lesson:['Nombre de la asignatura\nDocente · Fecha','Explica los conceptos y añade ejemplos.','Plantea una actividad y los criterios de revisión.'],report:['Proyecto · Autor · Fecha','Presenta los resultados y las evidencias.','Explica lo aprendido y las acciones recomendadas.'],portfolio:['Una breve presentación de tu trabajo.','Describe los proyectos y tu contribución.','Correo · Sitio web · Redes profesionales']};
 topics[id].forEach((title,i)=>{if(i)engine.insertBlankSlide(opened,i-1);const slide=opened.deck.slides[i];engine.setSlideBackground(opened,slide,palette.background);rect(slide,0,0,.16,7.5,palette.accent);box(slide,title,.8,i?1:1.7,10.9,1.3,i?36:46,palette.text,true);rect(slide,.8,i?2.4:3.3,1.05,.05,palette.accent);box(slide,bodies[id][i],.8,i?2.8:3.7,10.8,2.1,22,palette.text);box(slide,String(i+1),11.9,6.85,.55,.3,12,palette.accent);});return opened;
}
export function buildPublicationTemplate(opened:any,id:string){
 creationTemplate('publisher',id);const landscape=id==='brochure';engine.setSlideSize(opened,(landscape?11.6929:8.2677)*E,(landscape?8.2677:11.6929)*E);if(id==='blank')return opened;
 const slide=opened.deck.slides[0],width=opened.deck.size.cx/E,height=opened.deck.size.cy/E,accent=id==='newsletter'?'#386b9a':id==='brochure'?'#147d80':id==='certificate'?'#6254c8':id==='invitation'?'#a46b39':'#aa4f78';engine.setSlideBackground(opened,slide,'#ffffff');
 if(id==='certificate'){rect(slide,.45,.45,width-.9,.09,accent);rect(slide,.45,height-.55,width-.9,.09,accent);box(slide,'Certificado',.8,2,width-1.6,1,38,accent,true);box(slide,'Se otorga a',.8,3.8,width-1.6,.5,18,'#657086');box(slide,'Nombre de la persona',.8,4.6,width-1.6,1,29,'#293246',true);box(slide,'Por su participación y compromiso.\nNombre de la actividad · Fecha',.8,6,width-1.6,1.5,19,'#657086');box(slide,'Nombre y firma de quien certifica',.8,9,width-1.6,1,16,'#657086');}
 else if(id==='brochure'){for(let i=0;i<3;i++){const x=i*width/3;rect(slide,x,0,width/3,1.1,accent);box(slide,['Tu organización','Nuestros servicios','Contacto'][i],x+.3,.32,width/3-.6,.5,21,'#ffffff',true);box(slide,['Presenta el propósito de tu organización y a quién ayudas.','Describe los servicios y lo que incluye cada uno.','Dirección\nTeléfono\nCorreo electrónico\nSitio web'][i],x+.3,1.6,width/3-.6,4.8,17,'#334b50');}}
 else if(id==='newsletter'){rect(slide,0,0,width,1.5,accent);box(slide,'Nuestro boletín',.6,.45,width-1.2,.7,32,'#ffffff',true);box(slide,'Edición · Fecha',.6,1.8,width-1.2,.4,13,accent);for(let i=0;i<2;i++){const x=.6+i*(width-.8)/2;box(slide,i?'Segunda noticia':'Noticia principal',x,2.6,(width-1.8)/2,.8,23,accent,true);box(slide,'Escribe el contenido de la noticia. Añade información clara, una imagen y los datos de contacto.',x,3.7,(width-1.8)/2,5.7,17,'#364459');}box(slide,'Organización · Contacto',.6,10.7,width-1.2,.4,12,accent);}
 else{rect(slide,0,0,width,.3,accent);box(slide,id==='invitation'?'Estás invitado':'Una gran idea',.8,2.1,width-1.6,1.6,42,accent,true);box(slide,id==='invitation'?'Nombre del evento':'El mensaje de tu cartel',.8,4.4,width-1.6,1.2,27,'#293246',true);box(slide,'Fecha · Hora\nLugar del evento\nContacto y más información',.8,6.5,width-1.6,2.4,20,'#69768c');rect(slide,.8,10.2,width-1.6,.05,accent);}
 return opened;
}
export function applyPresentationDesign(opened:any,id:string){const design=presentationDesigns.find(d=>d.id===id);if(!design)throw Error('Diseño desconocido.');const visit=(element:any)=>{for(const paragraph of element.text?.paragraphs??[])for(const run of paragraph.runs??[]){run.color=design.text;run.fontFamily='Carlito';element.dirty=true;}for(const child of element.children??[])visit(child);for(const row of element.rows??[]){for(const cell of row)visit(cell);element.dirty=true;}};for(const slide of opened.deck.slides){engine.setSlideBackground(opened,slide,design.background);slide.elements.forEach(visit);}}
