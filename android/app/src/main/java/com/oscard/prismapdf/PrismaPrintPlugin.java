package com.oscard.prismapdf;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.pdf.PdfDocument;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.util.Base64;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.util.ArrayList;

@CapacitorPlugin(name="PrismaPrint")
public class PrismaPrintPlugin extends Plugin {
  @PluginMethod public void print(PluginCall call) {
    File temporary = null;
    try {
      String data=call.getString("data"),name=call.getString("name","Prisma PDF");
      if(data==null||data.length()>140*1024*1024)throw new IllegalArgumentException("Documento de impresión no válido.");
      byte[] bytes=Base64.decode(data,Base64.DEFAULT);
      temporary=File.createTempFile("prisma-print-",".pdf",getContext().getCacheDir());
      try(FileOutputStream stream=new FileOutputStream(temporary)){stream.write(bytes);}
      final File pdf=temporary;
      final int count;
      try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(pdf,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer=new PdfRenderer(fd)){count=renderer.getPageCount();}
      getActivity().runOnUiThread(()->{
        try {
          PrintManager manager=(PrintManager)getContext().getSystemService(Context.PRINT_SERVICE);
          if(manager==null)throw new IllegalStateException("La impresión no está disponible en este dispositivo.");
          manager.print(name,new LocalAdapter(pdf,name,count),new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setColorMode(PrintAttributes.COLOR_MODE_COLOR).setMinMargins(PrintAttributes.Margins.NO_MARGINS).build());call.resolve();
        }catch(Exception e){pdf.delete();call.reject(e.getMessage());}
      });
    }catch(Exception e){if(temporary!=null)temporary.delete();call.reject(e.getMessage());}
  }
  private static class LocalAdapter extends PrintDocumentAdapter {
    private final File file;private final String name;private final int count;
    LocalAdapter(File file,String name,int count){this.file=file;this.name=name;this.count=count;}
    @Override public void onLayout(PrintAttributes oldAttributes,PrintAttributes newAttributes,CancellationSignal cancellation,LayoutResultCallback callback,Bundle extras){
      if(cancellation.isCanceled()){callback.onLayoutCancelled();return;}
      callback.onLayoutFinished(new PrintDocumentInfo.Builder(name+".pdf").setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).setPageCount(count).build(),!newAttributes.equals(oldAttributes));
    }
    @Override public void onWrite(PageRange[] ranges,ParcelFileDescriptor destination,CancellationSignal cancellation,WriteResultCallback callback){
      new Thread(()->{
        try(FileOutputStream stream=new FileOutputStream(destination.getFileDescriptor())){
          ArrayList<Integer> selected=new ArrayList<>();for(int i=0;i<count;i++)for(PageRange range:ranges)if(i>=range.getStart()&&i<=range.getEnd()){selected.add(i);break;}
          if(cancellation.isCanceled()){callback.onWriteCancelled();return;}
          if(selected.size()==count){try(java.io.InputStream input=new FileInputStream(file)){byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1){if(cancellation.isCanceled()){callback.onWriteCancelled();return;}stream.write(buffer,0,n);}}}
          else try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer=new PdfRenderer(fd)){
            PdfDocument output=new PdfDocument();try {
            for(int index:selected){if(cancellation.isCanceled()){callback.onWriteCancelled();return;}try(PdfRenderer.Page source=renderer.openPage(index)){
              double scale=Math.min(2,2200.0/Math.max(source.getWidth(),source.getHeight()));Bitmap bitmap=Bitmap.createBitmap(Math.max(1,(int)(source.getWidth()*scale)),Math.max(1,(int)(source.getHeight()*scale)),Bitmap.Config.ARGB_8888);bitmap.eraseColor(android.graphics.Color.WHITE);
              try{source.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_PRINT);PdfDocument.Page target=output.startPage(new PdfDocument.PageInfo.Builder(source.getWidth(),source.getHeight(),index+1).create());Canvas canvas=target.getCanvas();canvas.drawBitmap(bitmap,null,new android.graphics.Rect(0,0,source.getWidth(),source.getHeight()),null);output.finishPage(target);}finally{bitmap.recycle();}
            }}output.writeTo(stream); } finally { output.close(); }
          }
          if(cancellation.isCanceled())callback.onWriteCancelled();else callback.onWriteFinished(ranges);
        }catch(Exception e){callback.onWriteFailed(e.getMessage());}
      },"PrismaPrint").start();
    }
    @Override public void onFinish(){file.delete();}
  }
}
