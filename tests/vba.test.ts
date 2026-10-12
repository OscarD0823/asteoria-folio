import test from 'node:test';
import assert from 'node:assert/strict';
import {SheetsBook} from '../src/sheets-core';
import {sheetMacroSnapshot,applySheetMacro} from '../src/macro-adapters';
import {vbaExample,vbaProcedures,planVbaMacro} from '../src/vba';
function fixture(){const book=new SheetsBook();[[2,12.5],[4,3.25],[3,17],[5,2.5],[8,1.75]].forEach((values,row)=>values.forEach((value,col)=>book.set('Hoja1',row+1,col+1,String(value))));return book;}
const module=(body:string)=>'Option Explicit\nSub Prueba()\n'+body+'\nEnd Sub';
test('VBA previews chained cell calculations without mutation and applies them in one validated transaction',()=>{
 const book=fixture(),snapshot=sheetMacroSnapshot(book),plan=planVbaMacro(vbaExample,snapshot);
 assert.equal(book.value('Hoja1',7,3),null);assert.equal(plan.operations.length,8);applySheetMacro(book,plan.operations,plan.revision);
 assert.equal(book.value('Hoja1',7,3),115.5);assert.equal(book.value('Hoja1',8,3),21.95);assert.equal(book.value('Hoja1',9,3),137.45);
 assert.throws(()=>applySheetMacro(book,plan.operations,plan.revision),/cambió/);book.destroy();
});
test('VBA reads formulas assigned earlier, handles range aggregates, conditions and bankers rounding',()=>{
 const book=new SheetsBook(),source=module('Dim i As Long\nFor i = 3 To 1 Step -1\nCells(i,1).Value = i\nNext i\nRange("B1").Formula = "=SUM(A1:A3)"\nIf Range("B1").Value = 6 Then\nRange("C1").Value = WorksheetFunction.Sum(Range("A1:A3"))\nElse\nRange("C1").Value = -1\nEnd If\nRange("D1").Value = Round(2.5)\nRange("E1").Value = Round(3.5)\nRange("F1").Value = -2^2\nRange("G1").Value = Trim("  Prisma  ") & " VBA"');
 const plan=planVbaMacro(source,sheetMacroSnapshot(book));applySheetMacro(book,plan.operations,plan.revision);
 assert.deepEqual([0,1,2,3,4,5,6].map(col=>book.value('Hoja1',0,col)),[1,6,6,2,4,-4,'Prisma VBA']);book.destroy();
});
test('VBA rejects unsupported host access, invalid procedures, ranges and unbounded loops before applying any changes',()=>{
 const book=new SheetsBook(),snapshot=sheetMacroSnapshot(book);
 for(const body of ['Range("A1").Value = 1\nShell "calc.exe"','Range("A1").Value = CreateObject("Scripting.FileSystemObject")','For i = 1 To 100000\nNext i','Range("A1:B2000").Value = 1','Worksheets("Falta").Range("A1").Value = 1','Range("A1").Value = 1/0','Range("A1").Value = 10^1000'])assert.throws(()=>planVbaMacro(module(body),snapshot));
 assert.equal(book.value('Hoja1',0,0),null);assert.deepEqual(vbaProcedures('Sub Primero()\nEnd Sub\nPrivate Sub Segundo()\nEnd Sub'),['Primero','Segundo']);book.destroy();
});
test('VBA preserves literal formula-like strings and can address an empty existing worksheet',()=>{
 const book=new SheetsBook();book.workbook.addWorksheet('Vacía');book.rebuild();const plan=planVbaMacro(module('Worksheets("Vacía").Range("A1").Value = "=1+2"\nRange("A1:A2").Value = "a""b"'),sheetMacroSnapshot(book));applySheetMacro(book,plan.operations,plan.revision);
 assert.equal(book.value('Vacía',0,0),'=1+2');assert.equal(book.value('Hoja1',1,0),'a"b');book.destroy();
});
test('VBA recalculates existing dependent formulas after cell writes and distinguishes WorksheetFunction.Round',()=>{
 const book=new SheetsBook();book.set('Hoja1',0,0,'2');book.workbook.definedNames.add('Hoja1!$A$1','Cantidad');book.rebuild();book.set('Hoja1',0,1,'=Cantidad*2');const plan=planVbaMacro(module('Range("A1").Value = 7\nRange("C1").Value = Range("B1").Value\nRange("D1").Value = WorksheetFunction.Round(2.5,0)'),sheetMacroSnapshot(book));applySheetMacro(book,plan.operations,plan.revision);assert.equal(book.value('Hoja1',0,2),14);assert.equal(book.value('Hoja1',0,3),3);book.destroy();
});
