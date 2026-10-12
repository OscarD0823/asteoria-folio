import test from 'node:test';import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';import {SheetsBook,canonicalFormula} from '../src/sheets-core';
import {expandExcelLet,workbookNames} from '../src/spreadsheet-formulas';
test('Excel namespaces are normalized outside quoted text and worksheet names',()=>{assert.equal(canonicalFormula('=_xlfn.XLOOKUP(A1,A2:A5,B2:B5,"_xlfn.KEEP")'),'=XLOOKUP(A1,A2:A5,B2:B5,"_xlfn.KEEP")');});
test('LET supports dependent variables, nested shadowing, text and worksheet references',()=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('Datos');sheet.getCell('A1').value=4;sheet.getCell('B1').value=3;
 sheet.getCell('C1').value={formula:'_xlfn.LET(_xlpm.cantidad,A1,_xlpm.precio,B1,_xlpm.importe,_xlpm.cantidad*_xlpm.precio,_xlpm.importe*2)'};
 sheet.getCell('D1').value={formula:'LET(x,2,LET(x,3,x)+x)'};sheet.getCell('E1').value={formula:'LET(texto,"x,LET(5)",texto&" Datos")'};
 const book=new SheetsBook(wb);assert.equal(book.value('Datos',0,2),24);assert.equal(book.value('Datos',0,3),5);assert.equal(book.value('Datos',0,4),'x,LET(5) Datos');book.set('Datos',0,0,'10');assert.equal(book.value('Datos',0,2),60);
});
test('named ranges participate in dependency recalculation',()=>{const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('Datos');sheet.getCell('A1').value=10;sheet.getCell('A2').value=20;wb.definedNames.add('Datos!$A$1:$A$2','Ventas');sheet.getCell('C1').value={formula:'SUM(Ventas)'};const book=new SheetsBook(wb);assert.equal(book.value('Datos',0,2),30);book.set('Datos',1,0,'50');assert.equal(book.value('Datos',0,2),60);});
test('workbook names preserve constants and local scopes while omitting print settings',()=>{assert.deepEqual(workbookNames('<definedNames><definedName name="Tasa">0.19</definedName><definedName name="Monto" localSheetId="1">Datos!$A$1</definedName><definedName name="_xlnm.Print_Area">Datos!$A$1</definedName></definedNames>'),[{name:'Tasa',expression:'=0.19'},{name:'Monto',expression:'=Datos!$A$1',scope:1}]);assert.throws(()=>expandExcelLet('LET(A1,5,A1)'),/variable/);});
test('Excel logical constants and criteria functions recalculate with dependent cells',()=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('Datos');[10,20,20].forEach((v,i)=>sheet.getCell('A'+(i+1)).value=v);['Sur','Sur','Norte'].forEach((v,i)=>sheet.getCell('B'+(i+1)).value=v);
 ['AVERAGEIFS(A1:A3,B1:B3,"Sur")','RANK.EQ(A1,A1:A3,0)','VLOOKUP(20,A1:B3,2,FALSE)','TEXTJOIN(" / ",TRUE,B1:B3)','INDIRECT("A1")'].forEach((formula,i)=>sheet.getCell(1,i+3).value={formula});
 const book=new SheetsBook(wb);assert.deepEqual([2,3,4,5,6].map(col=>book.value('Datos',0,col)),[15,3,'Sur','Sur / Sur / Norte',10]);book.set('Datos',0,0,'30');assert.equal(book.value('Datos',0,2),25);assert.equal(book.value('Datos',0,3),1);assert.equal(book.value('Datos',0,6),30);book.destroy();
});
test('array constants keep their row delimiters and bad LET edits leave the previous cell intact',()=>{
 assert.equal(canonicalFormula('=SUM({1,2;3,4})'),'=SUM({1,2;3,4})');assert.equal(canonicalFormula('=SUMA(A1;2,5)'),'=SUM(A1,2.5)');
 const book=new SheetsBook();book.set('Hoja1',0,0,'7');assert.throws(()=>book.set('Hoja1',0,0,'=LET(A1,2,A1)'),/variable/);assert.equal(book.value('Hoja1',0,0),7);assert.equal(book.input('Hoja1',0,0),'7');book.destroy();
});
test('Excel negative INT and decimal ROUNDUP match their native numeric semantics',()=>{
 const book=new SheetsBook();book.set('Hoja1',0,0,'=INT(-3.7)');book.set('Hoja1',0,1,'=ROUNDUP(1086.61/7,2)');book.set('Hoja1',0,2,'=ROUNDUP(-1086.61/7,2)');assert.equal(book.value('Hoja1',0,0),-4);assert.equal(book.value('Hoja1',0,1),155.23);assert.equal(book.value('Hoja1',0,2),-155.23);book.destroy();
});
