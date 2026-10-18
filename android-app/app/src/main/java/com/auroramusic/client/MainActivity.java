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
import android.webkit.JavascriptInterface;
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
import java.util.Locale;

/** Thin Android client; all library/radio logic stays on the private Raspberry Pi server. */
public final class MainActivity extends Activity {
    private static final String PREFS = "aurora_connection";
    private static final String KEY_URL = "server_url";
    private static final String KEY_LANGUAGE = "language";
    private static final String[] LANGUAGE_CODES = {"es", "en", "pt", "fr", "de", "it"};
    private static final String[] LANGUAGE_NAMES = {"Español", "English", "Português", "Français", "Deutsch", "Italiano"};
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

    private String language() {
        String saved = getPreferences(MODE_PRIVATE).getString(KEY_LANGUAGE, "");
        if (supportedLanguage(saved)) return saved;
        String system = Locale.getDefault().getLanguage();
        return supportedLanguage(system) ? system : "es";
    }
    private boolean supportedLanguage(String code) {
        for (String available : LANGUAGE_CODES) if (available.equals(code)) return true;
        return false;
    }
    private String tr(String es, String en, String pt, String fr, String de, String it) {
        switch (language()) {
            case "en": return en;
            case "pt": return pt;
            case "fr": return fr;
            case "de": return de;
            case "it": return it;
            default: return es;
        }
    }
    public final class LanguageBridge {
        @JavascriptInterface public void setLanguage(String code) {
            if (supportedLanguage(code)) getPreferences(MODE_PRIVATE).edit().putString(KEY_LANGUAGE, code).apply();
        }
    }

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
        TextView tip = label(tr("Conectá la app a tu servidor de música en la Raspberry Pi 5.", "Connect the app to your Raspberry Pi 5 music server.", "Conecte o app ao seu servidor de música na Raspberry Pi 5.", "Connectez l'application à votre serveur de musique Raspberry Pi 5.", "Verbinde die App mit deinem Musikserver auf dem Raspberry Pi 5.", "Collega l'app al tuo server musicale Raspberry Pi 5."), 15);
        tip.setPadding(0,dp(18),0,dp(14));
        form.addView(tip);
        Button languageButton = new Button(this);
        languageButton.setText(tr("Idioma: ", "Language: ", "Idioma: ", "Langue : ", "Sprache: ", "Lingua: ") + LANGUAGE_NAMES[java.util.Arrays.asList(LANGUAGE_CODES).indexOf(language())]);
        form.addView(languageButton);
        EditText url = new EditText(this);
        url.setSingleLine(true);
        url.setSelectAllOnFocus(true);
        url.setHint("http://192.168.1.100:8787");
        url.setText(current);
        url.setTextColor(Color.WHITE);
        url.setHintTextColor(0xFFAAAAAA);
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        form.addView(url);
        languageButton.setOnClickListener(v -> new AlertDialog.Builder(this)
            .setTitle(tr("Idioma", "Language", "Idioma", "Langue", "Sprache", "Lingua"))
            .setItems(LANGUAGE_NAMES, (d, which) -> {
                getPreferences(MODE_PRIVATE).edit().putString(KEY_LANGUAGE, LANGUAGE_CODES[which]).apply();
                showSetup(url.getText().toString());
            }).show());
        TextView warning = label(tr("Usá una red Wi-Fi de confianza. HTTP sin HTTPS envía la contraseña sin cifrar. Para conectarte desde fuera de casa, usá VPN o HTTPS.", "Use a trusted Wi-Fi network. HTTP sends your password without encryption. For remote access, use a VPN or HTTPS.", "Use uma rede Wi-Fi confiável. HTTP envia sua senha sem criptografia. Para acesso remoto, use VPN ou HTTPS.", "Utilisez un réseau Wi-Fi fiable. HTTP transmet votre mot de passe sans chiffrement. Pour un accès distant, utilisez un VPN ou HTTPS.", "Nutze ein vertrauenswürdiges WLAN. HTTP überträgt dein Passwort unverschlüsselt. Für Fernzugriff verwende VPN oder HTTPS.", "Usa una rete Wi-Fi affidabile. HTTP invia la password senza cifratura. Per l'accesso remoto usa VPN o HTTPS."), 12);
        warning.setPadding(0,dp(12),0,dp(18));
        form.addView(warning);
        Button connect = new Button(this);
        connect.setText(tr("Conectar al servidor", "Connect to server", "Conectar ao servidor", "Se connecter au serveur", "Mit Server verbinden", "Connetti al server"));
        form.addView(connect);
        connect.setOnClickListener(v -> {
            String entered = url.getText().toString().trim();
            Uri parsed = Uri.parse(entered);
            String scheme = parsed.getScheme();
            if (!("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme))
                || parsed.getHost()==null || parsed.getUserInfo()!=null || parsed.getFragment()!=null
                || parsed.getQuery()!=null || parsed.getPath()!=null && !parsed.getPath().isEmpty() && !"/".equals(parsed.getPath())) {
                Toast.makeText(this,tr("Ingresá una URL válida", "Enter a valid URL", "Digite uma URL válida", "Saisissez une URL valide", "Gib eine gültige URL ein", "Inserisci un URL valido") + " (http://192.168.1.100:8787)",Toast.LENGTH_LONG).show();
                return;
            }
            if ("http".equalsIgnoreCase(scheme)) {
                new AlertDialog.Builder(this).setTitle(tr("Conexión HTTP sin cifrar", "Unencrypted HTTP connection", "Conexão HTTP sem criptografia", "Connexion HTTP non chiffrée", "Unverschlüsselte HTTP-Verbindung", "Connessione HTTP non cifrata"))
                    .setMessage(tr("En esta conexión local, la contraseña se transmite sin cifrar. Continuá solo en una Wi-Fi de confianza. ¿Querés conectarte?", "Your password will be sent without encryption. Continue only on trusted Wi-Fi. Connect?", "Sua senha será enviada sem criptografia. Continue apenas em Wi-Fi confiável. Conectar?", "Votre mot de passe sera transmis sans chiffrement. Continuez seulement sur un Wi-Fi fiable. Se connecter ?", "Dein Passwort wird unverschlüsselt übertragen. Fahre nur in einem vertrauenswürdigen WLAN fort. Verbinden?", "La password verrà inviata senza cifratura. Continua solo su un Wi-Fi affidabile. Connettersi?"))
                    .setNegativeButton(tr("Cancelar", "Cancel", "Cancelar", "Annuler", "Abbrechen", "Annulla"),(d,w)->{})
                    .setPositiveButton(tr("Conectar", "Connect", "Conectar", "Se connecter", "Verbinden", "Connetti"),(d,w)->connect(entered)).show();
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
        swap.setText(tr("Servidor", "Server", "Servidor", "Serveur", "Server", "Server"));
        swap.setTextSize(11);
        bar.addView(swap);
        swap.setOnClickListener(v->new AlertDialog.Builder(this)
            .setTitle(tr("Cambiar servidor", "Change server", "Alterar servidor", "Changer de serveur", "Server wechseln", "Cambia server"))
            .setMessage(tr("¿Querés cambiar la dirección del servidor de Aurora Music?", "Do you want to change the Aurora Music server address?", "Deseja alterar o endereço do servidor Aurora Music?", "Voulez-vous changer l'adresse du serveur Aurora Music ?", "Möchtest du die Aurora-Music-Serveradresse ändern?", "Vuoi cambiare l'indirizzo del server Aurora Music?"))
            .setNegativeButton(tr("Cancelar", "Cancel", "Cancelar", "Annuler", "Abbrechen", "Annulla"),(d,w)->{})
            .setPositiveButton(tr("Cambiar", "Change", "Alterar", "Changer", "Ändern", "Cambia"),(d,w)->showSetup(origin)).show());
        root.addView(bar);
        web = new WebView(this);
        WebSettings opts = web.getSettings();
        opts.setJavaScriptEnabled(true);
        opts.setDomStorageEnabled(true);
        opts.setAllowFileAccess(false);
        opts.setAllowContentAccess(false);
        opts.setMediaPlaybackRequiresUserGesture(true);
        opts.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new LanguageBridge(), "AuroraAndroid");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target=request.getUrl();
                // Keep page navigation at our own server; external links open in another app.
                if (isSameOrigin(target)) return false;
                String s=target.getScheme();
                if ("http".equalsIgnoreCase(s) || "https".equalsIgnoreCase(s)) {
                    try {startActivity(new Intent(Intent.ACTION_VIEW,target));}
                    catch(ActivityNotFoundException ex){Toast.makeText(MainActivity.this,tr("No hay navegador disponible", "No browser available", "Nenhum navegador disponível", "Aucun navigateur disponible", "Kein Browser verfügbar", "Nessun browser disponibile"),Toast.LENGTH_LONG).show();}
                }
                return true;
            }
            @Override public void onReceivedHttpAuthRequest(WebView view,HttpAuthHandler handler,String host,String realm) {
                if (!host.equalsIgnoreCase(Uri.parse(origin).getHost())) {handler.cancel();return;}
                LinearLayout inputs = new LinearLayout(MainActivity.this);
                inputs.setOrientation(LinearLayout.VERTICAL);
                inputs.setPadding(dp(22),0,dp(22),0);
                EditText user = new EditText(MainActivity.this);
                user.setHint(tr("Usuario de Aurora", "Aurora username", "Usuário Aurora", "Utilisateur Aurora", "Aurora-Benutzername", "Nome utente Aurora"));
                user.setSingleLine(true);
                inputs.addView(user);
                EditText password = new EditText(MainActivity.this);
                password.setHint(tr("Contraseña", "Password", "Senha", "Mot de passe", "Passwort", "Password"));
                password.setSingleLine(true);
                password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                inputs.addView(password);
                new AlertDialog.Builder(MainActivity.this).setTitle(tr("Iniciar sesión", "Sign in", "Entrar", "Se connecter", "Anmelden", "Accedi"))
                    .setView(inputs)
                    .setPositiveButton(tr("Entrar", "Sign in", "Entrar", "Se connecter", "Anmelden", "Accedi"),(d,w)->handler.proceed(user.getText().toString(),password.getText().toString()))
                    .setNegativeButton(tr("Cancelar", "Cancel", "Cancelar", "Annuler", "Abbrechen", "Annulla"),(d,w)->handler.cancel())
                    .setOnCancelListener(d->handler.cancel()).show();
                // Credentials are not written to SharedPreferences.
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error) {
                handler.cancel();
                Toast.makeText(MainActivity.this,tr("Certificado HTTPS inválido. No se puede conectar.", "Invalid HTTPS certificate. Cannot connect.", "Certificado HTTPS inválido. Não é possível conectar.", "Certificat HTTPS invalide. Connexion impossible.", "Ungültiges HTTPS-Zertifikat. Verbindung nicht möglich.", "Certificato HTTPS non valido. Impossibile connettersi."),Toast.LENGTH_LONG).show();
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,android.webkit.WebResourceError error) {
                if(request.isForMainFrame())Toast.makeText(MainActivity.this,tr("No se pudo contactar el servidor. Revisá la IP y tu Wi-Fi.", "Could not reach the server. Check the IP and Wi-Fi.", "Não foi possível acessar o servidor. Verifique o IP e o Wi-Fi.", "Serveur inaccessible. Vérifiez l'adresse IP et le Wi-Fi.", "Server nicht erreichbar. Prüfe IP und WLAN.", "Server irraggiungibile. Controlla IP e Wi-Fi."),Toast.LENGTH_LONG).show();
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1f));
        web.loadUrl(origin + "/?lang=" + language());
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
