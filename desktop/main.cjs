const {app,BrowserWindow,protocol,net,shell,session}=require('electron');
const path=require('node:path');const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'prisma',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,allowServiceWorkers:true}}]);
let window;
const smoke=process.argv.includes('--smoke-test');
app.whenReady().then(()=>{
  const root=path.resolve(__dirname,'../dist');
  protocol.handle('prisma',request=>{const url=new URL(request.url);if(url.host!=='app')return new Response('Not found',{status:404});const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';const target=path.resolve(root,relative);if(target!==root&&!target.startsWith(root+path.sep))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(target).href);});
  window=new BrowserWindow({show:!smoke,width:1380,height:900,minWidth:760,minHeight:600,backgroundColor:'#111820',title:'Prisma PDF',icon:path.join(root,'icons/prisma-512.png'),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  if(smoke){window.webContents.on('did-fail-load',(_event,code,description)=>{console.error('Desktop load failed:',code,description);app.exit(1);});window.webContents.on('console-message',(_event,details)=>{if(details.level==='error')console.error('Renderer:',details.message);});window.webContents.on('did-finish-load',()=>{console.log('Desktop application loaded from bundled assets.');setTimeout(()=>app.exit(0),3000);});}
  window.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(github\.com|mupdf\.readthedocs\.io|www\.gnu\.org)\//.test(url))void shell.openExternal(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('prisma://app/'))event.preventDefault();});
  session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  session.defaultSession.on('will-download',(_event,item)=>item.setSaveDialogOptions({title:'Guardar tu documento',defaultPath:path.join(app.getPath('documents'),item.getFilename())}));
  window.loadURL('prisma://app/index.html');
});
app.on('window-all-closed',()=>app.quit());
