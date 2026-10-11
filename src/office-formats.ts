import {readOfficePackage} from './prisma-ooxml';
import {strFromU8} from 'fflate';
export function officePackageFormat(bytes:Uint8Array,kind:'docx'|'pptx'|'xlsx'){
 const parts=readOfficePackage(bytes),types=parts['[Content_Types].xml']?strFromU8(parts['[Content_Types].xml']):'',macro=/macroEnabled\.main\+xml/i.test(types)||Object.keys(parts).some(path=>/\/vbaProject\.bin$/i.test(path));
 const names={docx:macro?'docm':'docx',pptx:macro?'pptm':'pptx',xlsx:macro?'xlsm':'xlsx'},extension=names[kind];
 const mime=macro?{docx:'application/vnd.ms-word.document.macroEnabled.12',pptx:'application/vnd.ms-powerpoint.presentation.macroEnabled.12',xlsx:'application/vnd.ms-excel.sheet.macroEnabled.12'}[kind]:{docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[kind];
 return {extension,mime,macro};
}
