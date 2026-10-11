import test from 'node:test';import assert from 'node:assert/strict';
import {createPresentation,presentationEngine as engine,openPresentation,changeSlideText,EMU,slideText,collectRenderFonts} from '../src/slides-core';
import {renderPrismaSlide} from '../src/prisma-slide-render';
import {unzipSync} from 'fflate';
test('Prisma Slides creates editable PPTX and preserves untouched parts after text, table and image edits',async()=>{
 const model=await createPresentation(),slide=model.deck.slides[0];
 const text=engine.addElement(slide,{kind:'textbox',offset:{x:EMU,y:EMU,cx:6*EMU,cy:EMU},paragraphs:[{runs:[{text:'Título original',fontFamily:'Carlito',fontSize:28}]}]});
 engine.setSlideNotes(model,0,'Nota del presentador');const original=await engine.savePptx(model),reopened=await openPresentation(original);assert.deepEqual(await engine.savePptx(reopened),original);
 const edited=reopened.deck.slides[0].elements.find((e:any)=>slideText(e)==='Título original');assert.ok(edited);changeSlideText(edited,'Título editado');engine.setElementFont(reopened.deck.slides[0],edited.id,{bold:true});
 const result=engine.addTable(reopened,0,{rows:2,cols:2,offset:{x:EMU,y:3*EMU,cx:5*EMU,cy:2*EMU}});assert.ok(result);engine.editTableCellText(result.slide,result.elementId,0,0,[{runs:[{text:'Tabla 1',fontFamily:'Carlito',fontSize:18}]}]);
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6C4sAAAAASUVORK5CYII=','base64'));const picture=engine.addPicture(reopened,reopened.deck.slides[0],{bytes:png,ext:'png',offset:{x:EMU,y:EMU,cx:EMU,cy:EMU}});assert.ok(picture);
 const saved=await engine.savePptx(reopened),parts=unzipSync(saved),base=unzipSync(original);assert.deepEqual(parts['ppt/theme/theme1.xml'],base['ppt/theme/theme1.xml']);
 const again=await openPresentation(saved);assert.ok(again.deck.slides[0].elements.some((e:any)=>slideText(e)==='Título editado'));assert.equal(engine.getSlideNotes(again.archive,again.deck.slides[0].path),'Nota del presentador');assert.ok(again.deck.slides[0].elements.some((e:any)=>e.type==='table'));
 assert.ok(again.deck.slides[0].elements.some((e:any)=>e.type==='picture'));assert.ok(Object.entries(parts).some(([name,bytes])=>name.startsWith('ppt/media/')&&Buffer.from(bytes).equals(Buffer.from(png))));
 const render=renderPrismaSlide(again.deck.slides[0],{width:1280,size:again.deck.size,media:()=>undefined});assert.match(render.svg.replace(/<[^>]*>/g,''),/Tabla 1/);assert.ok(render.fonts.has('Carlito'));
 engine.insertBlankSlide(again,0);engine.duplicateSlide(again,0);assert.equal((await openPresentation(await engine.savePptx(again))).deck.slides.length,3);
});
