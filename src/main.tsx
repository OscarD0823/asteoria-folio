import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './extended.css';
import {Capacitor} from '@capacitor/core';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
if(import.meta.env.PROD&&!Capacitor.isNativePlatform()&&['http:','https:'].includes(location.protocol)&&'serviceWorker' in navigator){
  void navigator.serviceWorker.register(new URL('./sw.js',document.baseURI),{scope:'./'}).then(()=>navigator.serviceWorker.ready).then(()=>window.dispatchEvent(new Event('prisma-offline-ready'))).catch(()=>{/* PDF processing remains available without offline caching. */});
}
