import {SheetsBook} from './sheets-core';
import {creationTemplate} from './template-catalog';
export function createSheetTemplate(id:string){
 const template=creationTemplate('sheets',id),book=new SheetsBook(),sheet=book.sheet('Hoja1');sheet.name=id==='blank'?'Hoja1':template.title;
 if(id==='blank')return book;
 const data:Record<string,(string|number)[][]>={
 budget:[['Presupuesto'],['Datos de ejemplo editables'],[],['Concepto','Cantidad','Valor unitario','Total'],['Cuadernos',12,8500,'=B5*C5'],['Impresiones',80,300,'=B6*C6'],['Materiales',3,25000,'=B7*C7'],['Total','','','=SUM(D5:D7)']],
 inventory:[['Inventario'],['Datos de ejemplo editables'],[],['Producto','Existencias','Costo unitario','Valor total'],['Producto A',10,25000,'=B5*C5'],['Producto B',5,12000,'=B6*C6'],['Producto C',8,7500,'=B7*C7'],['Total','','','=SUM(D5:D7)']],
 expenses:[['Gastos mensuales'],['Ingreso disponible',1500000],[],['Concepto','Presupuesto','Gasto real','Diferencia'],['Alimentación',400000,350000,'=B5-C5'],['Transporte',200000,180000,'=B6-C6'],['Otros',300000,240000,'=B7-C7'],['Total','=SUM(B5:B7)','=SUM(C5:C7)','=SUM(D5:D7)'],['Saldo disponible','','','=B2-C8']],
 schedule:[['Plan de trabajo'],['Datos de ejemplo editables'],[],['Tarea','Responsable','Fecha','Estado'],['Definir alcance','Por asignar','Por definir','Pendiente'],['Preparar entrega','Por asignar','Por definir','Pendiente'],['Revisar resultados','Por asignar','Por definir','Pendiente']],
 };
 for(const [r,row] of data[id].entries())for(const [c,value] of row.entries())sheet.getCell(r+1,c+1).value=typeof value==='string'&&value.startsWith('=')?{formula:value.slice(1)}:value;
 sheet.mergeCells('A1:D1');sheet.getRow(1).font={name:'Calibri',size:22,bold:true,color:{argb:'FF'+template.color.slice(1)}};sheet.getRow(1).height=38;sheet.getRow(4).font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(4).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+template.color.slice(1)}};sheet.getRow(4).height=27;sheet.getColumn(1).width=30;[2,3,4].forEach(c=>sheet.getColumn(c).width=23);sheet.views=[{state:'frozen',ySplit:4}];
 if(id!=='schedule'){for(let r=5;r<=9;r++)for(let c=3;c<=4;c++)sheet.getCell(r,c).numFmt='"$"#,##0';sheet.getRow(8).font={bold:true};}
 sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0};book.rebuild();return book;
}
