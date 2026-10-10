package com.oscard.prismapdf;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="PrismaUpdates")
public class PrismaUpdatesPlugin extends Plugin {
  @PluginMethod public void openRelease(PluginCall call) {
    String url=call.getString("url", "");
    if (!url.matches("https://github\\.com/OscarD0823/prisma-pdf/releases/download/v[0-9.]+/Prisma-PDF-[0-9.]+-Android\\.apk")) {call.reject("Enlace de actualización no válido.");return;}
    try {getActivity().startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));call.resolve();}
    catch (Exception error) {call.reject("No se pudo abrir el navegador para descargar la actualización.");}
  }
}
