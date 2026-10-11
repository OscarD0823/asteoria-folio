import {useEffect, useRef} from 'react';
import {inPrisma, product} from './product';
import {takeLaunch, storeLaunch, type Launch} from './prisma-launch';
import {isEditorKind, type EditorKind} from './product-core';
import {creationTemplate} from './template-catalog';
type Handlers = {template?: (id:string)=>Promise<unknown>; save: () => Promise<unknown>; file: (file: File) => Promise<unknown>; recent: (id: string) => Promise<unknown>; error: (error: unknown) => void};
let saver: (() => Promise<unknown>) | undefined;
let navigating = false;
export function usePrismaNavigation(handlers: Handlers, ready = true) {
  const current = useRef(handlers), consumed = useRef(false); current.current = handlers;
  useEffect(() => {
    if (!inPrisma || !ready || !isEditorKind(product.kind)) return;
    const save = () => current.current.save(); saver = save;
    const token = new URLSearchParams(location.search).get('launch');
    if (token && !consumed.current) {
      consumed.current = true;
      void takeLaunch(token, product.kind).then(async launch => {
        if (!launch) throw Error('El archivo pendiente ya no está disponible. Vuelve a abrirlo desde Prisma.');
        if (launch.action === 'file' && launch.file) await current.current.file(launch.file);
        else if (launch.action === 'recent' && launch.id) await current.current.recent(launch.id);
        else if (launch.action === 'template' && launch.id && current.current.template) await current.current.template(launch.id);
        const url = new URL(location.href); url.searchParams.delete('launch'); history.replaceState(null, '', url);
      }).catch(error => current.current.error(error));
    }
    return () => { if (saver === save) saver = undefined; };
  }, [ready]);
}
export async function navigatePrisma(editor?: EditorKind, launch?: Launch) {
  if (navigating) return; navigating = true;
  try {
    if (isEditorKind(product.kind)) {
      if (!saver) throw Error('Espera a que termine de abrir el editor.');
      await saver();
    }
    if(launch?.action==='template'){if(!launch.id)throw Error('Elige una plantilla.');creationTemplate(launch.editor,launch.id);}
    const token = launch ? await storeLaunch(launch) : undefined;
    const url = new URL(location.href); url.search = ''; url.hash = '';
    if (editor) url.searchParams.set('editor', editor);
    if (token) url.searchParams.set('launch', token);
    location.assign(url.href);
  } catch (error) { navigating = false; throw error; }
}
