import type {PrismaSlide,PrismaElement,PrismaParagraph} from './prisma-presentation';
import {xmlEscape as esc} from './prisma-ooxml';
type Options={width:number;size:{cx:number;cy:number};media:(path:string)=>string|undefined;measure?:(text:string,style:any)=>number};
export function renderPrismaSlide(slide:PrismaSlide,options:Options){
 const width=options.width,height=width*options.size.cy/options.size.cx,scale=width/options.size.cx,point=12700*scale;
 let definitions='',counter=0;const names=new Set<string>(['Carlito']);
 const measure=(text:string,run:any)=>options.measure?.(text,run)??Array.from(text).length*(run.fontSize??18)*.52;
 function text(ps:PrismaParagraph[],box:{x:number;y:number;width:number;height:number},padding=5){
  const id='prisma-text-'+counter++;definitions+='<clipPath id="'+id+'"><rect x="'+box.x+'" y="'+box.y+'" width="'+Math.max(0,box.width)+'" height="'+Math.max(0,box.height)+'"/></clipPath>';
  let y=box.y+padding,result='<g clip-path="url(#'+id+')">';
  for(const p of ps){
   let line:{text:string;run:any;width:number}[]=[],lineWidth=0,lineHeight=0;
   const flush=()=>{if(!line.length)return;y+=lineHeight*.85;let x=box.x+padding+(p.alignment==='ctr'?(box.width-padding*2-lineWidth)/2:p.alignment==='r'?box.width-padding*2-lineWidth:0);for(const segment of line){const run=segment.run,size=(run.fontSize??18)*point;names.add(run.fontFamily??'Carlito');result+='<text xml:space="preserve" x="'+x+'" y="'+y+'" fill="'+esc(run.color||'#20243b')+'" font-family="'+esc(run.fontFamily||'Carlito')+'" font-size="'+size+'" font-weight="'+(run.bold?700:400)+'" font-style="'+(run.italic?'italic':'normal')+'"'+(run.underline?' text-decoration="underline"':'')+'>'+esc(segment.text)+'</text>';x+=segment.width;}y+=lineHeight*.37;line=[];lineWidth=0;lineHeight=0;};
   for(const run of p.runs){const tokens=run.text.split(/(\n|[ \t]+)/u);for(const token of tokens){if(token==='\n'){flush();continue;}if(!token)continue;const tokenWidth=measure(token,run)*point;if(line.length&&lineWidth+tokenWidth>box.width-padding*2&&!/^[ \t]+$/.test(token))flush();line.push({text:token,run,width:tokenWidth});lineWidth+=tokenWidth;lineHeight=Math.max(lineHeight,(run.fontSize??18)*point);}}flush();if(!p.runs.length)y+=18*point*1.22;
  }
  return result+'</g>';
 }
 function element(el:PrismaElement){const o=el.transform.offset,x=o.x*scale,y=o.y*scale,w=o.cx*scale,h=o.cy*scale,angle=el.transform.rot/60000;let svg='<g transform="rotate('+angle+' '+(x+w/2)+' '+(y+h/2)+')">';
  if(el.type==='picture'&&el.mediaPath){const media=options.media(el.mediaPath);if(media)svg+='<image x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none" href="'+esc(media)+'"/>';}
  else if(el.type==='table'){const rows=el.rows??[],cols=rows[0]?.length??1,weights=el.columnWidths??Array(cols).fill(1),total=weights.reduce((s:number,n:number)=>s+n,0)||cols;for(let r=0;r<rows.length;r++){let left=x;for(let c=0;c<cols;c++){const cellWidth=w*(weights[c]??1)/total,cellHeight=h/rows.length,top=y+r*cellHeight;svg+='<rect x="'+left+'" y="'+top+'" width="'+cellWidth+'" height="'+cellHeight+'" fill="'+(r===0?'#ece6fa':'#ffffff')+'" stroke="#b8b0c6" stroke-width="1"/>'+text(rows[r][c].text?.paragraphs??[],{x:left,y:top,width:cellWidth,height:cellHeight},5);left+=cellWidth;}}}
  else if(el.type!=='passthrough'){if(el.fillColor){if(el.shape==='ellipse')svg+='<ellipse cx="'+(x+w/2)+'" cy="'+(y+h/2)+'" rx="'+w/2+'" ry="'+h/2+'" fill="'+esc(el.fillColor)+'"/>';else svg+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+esc(el.fillColor)+'"/>';}if(el.text)svg+=text(el.text.paragraphs,{x,y,width:w,height:h});}
  return svg+'</g>';
 }
 const elements=slide.elements.map(element).join('');return {widthPx:width,heightPx:height,fonts:names,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><defs>'+definitions+'</defs><rect width="100%" height="100%" fill="'+esc(slide.background?.color||'#ffffff')+'"/>'+elements+'</svg>'};
}
