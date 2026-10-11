import {defaultLayout,type FlowDocument,type RichNode} from './flow';
import {normalizeAcademicDocument} from './academic';
import {creationTemplate} from './template-catalog';
export function createFlowTemplate(kind:'writer'|'pdf',id:string):FlowDocument{
 creationTemplate(kind,id);
 const p=(text='',type='paragraph',level=1):RichNode=>({type,attrs:{fontFamily:'Carlito',fontSize:type==='heading'?level===1?24:16:12,...(type==='heading'?{level}:{})},...(text?{content:[{type:'text',text}]}:{})});
 const heading=(text:string)=>p(text,'heading',2);
 const table=(rows:string[][]):RichNode=>({type:'table',content:rows.map((row,index)=>({type:'tableRow',content:row.map(text=>({type:index?'tableCell':'tableHeader',attrs:{colspan:1,rowspan:1},content:[p(text)]}))}))});
 let content:RichNode[]=[p()];
 if(id==='report')content=[p('Informe de resultados','heading'),p('Nombre del proyecto · Autor · Fecha'),heading('Resumen'),p('Describe el propósito del informe y los resultados principales.'),heading('Desarrollo'),p('Explica el trabajo realizado y la información que respalda los resultados.'),heading('Resultados'),table([['Indicador','Resultado'],['Primer indicador','Por completar'],['Segundo indicador','Por completar']]),heading('Conclusiones'),p('Escribe las conclusiones y los próximos pasos.')];
 if(id==='academic')content=[p('Título del trabajo','heading'),p('Nombre del autor'),p('Institución · Asignatura · Docente · Fecha'),heading('Introducción'),p('Presenta el problema, el objetivo y el alcance del trabajo.'),heading('Desarrollo'),p('Organiza tus argumentos y cita las fuentes utilizadas.'),heading('Conclusiones'),p('Relaciona las conclusiones con los objetivos del trabajo.'),heading('Referencias'),p('Añade referencias desde la pestaña Referencias.')];
 if(id==='letter')content=[p('Ciudad y fecha'),p('Nombre del destinatario'),p('Cargo o institución'),heading('Asunto de la carta'),p('Estimado destinatario:'),p('Escribe el motivo de tu carta y la información que deseas comunicar.'),p('Atentamente,'),p('Nombre y firma')];
 if(id==='minutes')content=[p('Acta de reunión','heading'),p('Fecha · Lugar · Participantes'),heading('Objetivo'),p('Describe el propósito de la reunión.'),heading('Acuerdos'),table([['Acuerdo','Responsable','Fecha'],['Por completar','Por completar','Por completar']]),heading('Próxima reunión'),p('Define la fecha y los temas pendientes.')];
 if(id==='cv')content=[p('Nombre y apellido','heading'),p('Profesión · Ciudad · Correo · Teléfono'),heading('Perfil profesional'),p('Describe tu experiencia y las habilidades relevantes para el cargo.'),heading('Experiencia'),p('Cargo · Organización · Fechas'),p('Describe tus responsabilidades y resultados.'),heading('Formación'),p('Título · Institución · Año'),heading('Habilidades'),p('Incluye tus habilidades técnicas e idiomas.')];
 if(id==='invoice')content=[p('Cuenta de cobro','heading'),p('Número · Fecha'),p('Emisor · Identificación · Contacto'),p('Destinatario · Identificación'),table([['Concepto','Cantidad','Valor unitario','Total'],['Por completar','1','0','0']]),p('Total por pagar: por completar'),p('Datos de pago y firma')];
 const flow:FlowDocument={content:{type:'doc',content},layout:defaultLayout(),language:'es'};
 if(id==='academic'){flow.academicStyle='apa';flow.layout={...flow.layout,top:25.4,bottom:25.4,left:25.4,right:25.4,numbering:true,pageNumberPosition:'header-right'};flow.content=normalizeAcademicDocument(flow.content,[],'apa');}
 return flow;
}
