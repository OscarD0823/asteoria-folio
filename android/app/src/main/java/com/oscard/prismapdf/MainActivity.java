package com.oscard.prismapdf;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle savedInstanceState){registerPlugin(PrismaPrintPlugin.class);super.onCreate(savedInstanceState);}
}
