import {HyperFormula,FunctionPlugin,FunctionArgumentType,CellError,ErrorType,type ImplementedFunctions} from 'hyperformula';

// These internal function names are used only for calculation. Export keeps Excel's formulas.
class ExcelRounding extends FunctionPlugin {
 static implementedFunctions:ImplementedFunctions={
  PRISMA_INT:{method:'integer',parameters:[{argumentType:FunctionArgumentType.NUMBER}]},
  PRISMA_ROUNDUP:{method:'up',parameters:[{argumentType:FunctionArgumentType.NUMBER},{argumentType:FunctionArgumentType.INTEGER}]},
 };
 integer(ast:any,state:any){return this.runFunction(ast.args,state,this.metadata('PRISMA_INT'),(value:number)=>Math.floor(value));}
 up(ast:any,state:any){return this.runFunction(ast.args,state,this.metadata('PRISMA_ROUNDUP'),(value:number,digits:number)=>{
  const scale=10**digits;if(!Number.isFinite(scale)||scale===0)return new CellError(ErrorType.NUM);
  const scaled=Math.abs(value)*scale;if(!Number.isFinite(scaled))return new CellError(ErrorType.NUM);
  // Excel works with 15 significant digits; ignore the extra binary digit at an integer boundary.
  return Math.sign(value)*Math.ceil(Number(scaled.toPrecision(15)))/scale;
 });}
}
HyperFormula.registerFunctionPlugin(ExcelRounding,{enGB:{PRISMA_INT:'PRISMA_INT',PRISMA_ROUNDUP:'PRISMA_ROUNDUP'}});
