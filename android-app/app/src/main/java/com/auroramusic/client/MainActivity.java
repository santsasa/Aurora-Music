package com.auroramusic.client;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.HttpAuthHandler;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.http.SslError;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/** Thin Android client; all library/radio logic stays on the private Raspberry Pi server. */
public final class MainActivity extends Activity {
    private static final String PREFS = "aurora_connection";
    private static final String KEY_URL = "server_url";
    private LinearLayout root;
    private WebView web;
    private String origin = "";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(16,19,32));
        getWindow().setNavigationBarColor(Color.rgb(16,19,32));
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(16,19,32));
        setContentView(root);
        String saved = getPreferences(MODE_PRIVATE).getString(KEY_URL, "");
        if (saved.isEmpty()) showSetup(""); else connect(saved);
    }

    private int dp(int value){return Math.round(getResources().getDisplayMetrics().density * value);}

    private TextView label(String content, int textSize) {
        TextView view = new TextView(this);
        view.setText(content);
        view.setTextColor(Color.WHITE);
        view.setTextSize(textSize);
        return view;
    }

    private void showSetup(String current) {
        origin = "";
        if (web != null) { web.stopLoading(); root.removeView(web); web.destroy(); web = null; }
        root.removeAllViews();
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(22), dp(48), dp(22), dp(24));
        form.setGravity(Gravity.CENTER_VERTICAL);
        form.addView(label("◉  Aurora Music", 30));
        TextView tip = label("Conectá la app a tu servidor de música en la Raspberry Pi 5.", 15);
        tip.setPadding(0,dp(18),0,dp(14));
        form.addView(tip);
        EditText url = new EditText(this);
        url.setSingleLine(true);
        url.setSelectAllOnFocus(true);
        url.setHint("http://192.168.1.100:8787");
        url.setText(current);
        url.setTextColor(Color.WHITE);
        url.setHintTextColor(0xFFAAAAAA);
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        form.addView(url);
        TextView warning = label("Usá una red Wi-Fi de confianza. HTTP sin HTTPS envía la contraseña sin cifrar. Para conectarte desde fuera de casa, usá VPN o HTTPS.", 12);
        warning.setPadding(0,dp(12),0,dp(18));
        form.addView(warning);
        Button connect = new Button(this);
        connect.setText("Conectar al servidor");
        form.addView(connect);
        connect.setOnClickListener(v -> {
            String entered = url.getText().toString().trim();
            Uri parsed = Uri.parse(entered);
            String scheme = parsed.getScheme();
            if (!("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme))
                || parsed.getHost()==null || parsed.getUserInfo()!=null || parsed.getFragment()!=null
                || parsed.getQuery()!=null || parsed.getPath()!=null && !parsed.getPath().isEmpty() && !"/".equals(parsed.getPath())) {
                Toast.makeText(this,"Ingresá una URL válida (ej.: http://192.168.1.100:8787)",Toast.LENGTH_LONG).show();
                return;
            }
            if ("http".equalsIgnoreCase(scheme)) {
                new AlertDialog.Builder(this).setTitle("Conexión HTTP sin cifrar")
                    .setMessage("En esta conexión local, la contraseña se transmite sin cifrar. Continuá solo en una Wi-Fi de confianza. ¿Querés conectarte?")
                    .setNegativeButton("Cancelar",(d,w)->{})
                    .setPositiveButton("Conectar",(d,w)->connect(entered)).show();
            } else connect(entered);
        });
        root.addView(form,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void connect(String url) {
        Uri parsed = Uri.parse(url.trim());
        String scheme=parsed.getScheme();
        if (scheme==null || !(scheme.equalsIgnoreCase("http")||scheme.equalsIgnoreCase("https")) || parsed.getHost()==null) {showSetup("");return;}
        origin = new Uri.Builder().scheme(scheme).encodedAuthority(parsed.getEncodedAuthority()).build().toString();
        getPreferences(MODE_PRIVATE).edit().putString(KEY_URL,origin).apply();
        root.removeAllViews();
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(14),dp(3),dp(6),dp(3));
        TextView brand = label("◉ Aurora Music",17);
        bar.addView(brand,new LinearLayout.LayoutParams(0,dp(42),1f));
        brand.setGravity(Gravity.CENTER_VERTICAL);
        Button swap = new Button(this);
        swap.setText("Servidor");
        swap.setTextSize(11);
        bar.addView(swap);
        swap.setOnClickListener(v->new AlertDialog.Builder(this)
            .setTitle("Cambiar servidor")
            .setMessage("¿Querés cambiar la dirección del servidor de Aurora Music?")
            .setNegativeButton("Cancelar",(d,w)->{})
            .setPositiveButton("Cambiar",(d,w)->showSetup(origin)).show());
        root.addView(bar);
        web = new WebView(this);
        WebSettings opts = web.getSettings();
        opts.setJavaScriptEnabled(true);
        opts.setDomStorageEnabled(true);
        opts.setAllowFileAccess(false);
        opts.setAllowContentAccess(false);
        opts.setMediaPlaybackRequiresUserGesture(true);
        opts.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target=request.getUrl();
                // Keep page navigation at our own server; external links open in another app.
                if (isSameOrigin(target)) return false;
                String s=target.getScheme();
                if ("http".equalsIgnoreCase(s) || "https".equalsIgnoreCase(s)) {
                    try {startActivity(new Intent(Intent.ACTION_VIEW,target));}
                    catch(ActivityNotFoundException ex){Toast.makeText(MainActivity.this,"No hay navegador disponible",Toast.LENGTH_LONG).show();}
                }
                return true;
            }
            @Override public void onReceivedHttpAuthRequest(WebView view,HttpAuthHandler handler,String host,String realm) {
                if (!host.equalsIgnoreCase(Uri.parse(origin).getHost())) {handler.cancel();return;}
                LinearLayout inputs = new LinearLayout(MainActivity.this);
                inputs.setOrientation(LinearLayout.VERTICAL);
                inputs.setPadding(dp(22),0,dp(22),0);
                EditText user = new EditText(MainActivity.this);
                user.setHint("Usuario de Aurora");
                user.setSingleLine(true);
                inputs.addView(user);
                EditText password = new EditText(MainActivity.this);
                password.setHint("Contraseña");
                password.setSingleLine(true);
                password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                inputs.addView(password);
                new AlertDialog.Builder(MainActivity.this).setTitle("Iniciar sesión")
                    .setView(inputs)
                    .setPositiveButton("Entrar",(d,w)->handler.proceed(user.getText().toString(),password.getText().toString()))
                    .setNegativeButton("Cancelar",(d,w)->handler.cancel())
                    .setOnCancelListener(d->handler.cancel()).show();
                // Credentials are not written to SharedPreferences.
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error) {
                handler.cancel();
                Toast.makeText(MainActivity.this,"Certificado HTTPS inválido. No se puede conectar.",Toast.LENGTH_LONG).show();
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,android.webkit.WebResourceError error) {
                if(request.isForMainFrame())Toast.makeText(MainActivity.this,"No se pudo contactar el servidor. Revisá la IP y tu Wi-Fi.",Toast.LENGTH_LONG).show();
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1f));
        web.loadUrl(origin + "/");
    }

    private boolean isSameOrigin(Uri candidate) {
        Uri base=Uri.parse(origin);
        return base.getScheme().equalsIgnoreCase(candidate.getScheme())
            && base.getHost().equalsIgnoreCase(candidate.getHost())
            && effectivePort(base)==effectivePort(candidate);
    }
    private int effectivePort(Uri u){return u.getPort()>=0?u.getPort():("https".equalsIgnoreCase(u.getScheme())?443:80);}

    @Override public void onBackPressed() {
        if(web!=null && web.canGoBack())web.goBack(); else if(web!=null)showSetup(origin); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if(web!=null){web.stopLoading();web.destroy();web=null;}
        super.onDestroy();
    }
}
