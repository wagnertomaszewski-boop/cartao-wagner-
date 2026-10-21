package br.com.wagnertomaszewski.painelmandato;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.JavascriptInterface;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String HOME = "https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/index.html";
    private static final String AGENDA = "https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/agenda.html";
    private static final int REQUEST_NOTIFICACAO = 2005;
    private static final String ALLOWED_PREFIX = "https://wagnertomaszewski-boop.github.io/cartao-wagner-/";
    private static final int REQUEST_FILE = 2011;
    private WebView web;
    private ValueCallback<Uri[]> fileResult;
    private FrameLayout root;
    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(7, 63, 119));
        getWindow().setNavigationBarColor(Color.rgb(7, 45, 82));
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 63, 119));
        // No Android 15+, alocar espaço para barras do sistema com edge-to-edge.
        // Evita que botões do painel fiquem atrás da barra de status/navegação.
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(
                    android.view.WindowInsets.Type.systemBars()
                    | android.view.WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(root);
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        status = new TextView(this);
        status.setText("Carregando Painel do Mandato…");
        status.setTextColor(Color.WHITE);
        status.setTextSize(16);
        status.setGravity(android.view.Gravity.CENTER);
        root.addView(status, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new PonteLembretes(), "MandatoLembretes");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                if (url.startsWith(ALLOWED_PREFIX) && "https".equals(uri.getScheme())) {
                    return false;
                }
                openExternal(uri);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                status.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                status.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view,
                WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    status.setText("Não foi possível conectar ao Painel do Mandato.\nVerifique sua internet e tente novamente.");
                    status.setVisibility(View.VISIBLE);
                    status.setOnClickListener(v -> {
                        status.setText("Carregando Painel do Mandato…");
                        web.reload();
                    });
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView,
                 ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileResult != null) fileResult.onReceiveValue(null);
                fileResult = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, REQUEST_FILE);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    fileResult = null;
                    return false;
                }
            }
        });
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url.startsWith("https://")) openExternal(Uri.parse(url));
        });
        if (savedInstanceState == null) web.loadUrl(
            getIntent().getBooleanExtra("abrirAgenda", false) ? AGENDA : HOME);
        else web.restoreState(savedInstanceState);
    }

    private final class PonteLembretes {
        @JavascriptInterface public String estado() {
            return Lembretes.estado(MainActivity.this);
        }

        @JavascriptInterface public void sincronizar(String eventos) {
            runOnUiThread(() -> Lembretes.sincronizar(MainActivity.this, eventos));
        }

        @JavascriptInterface public void ativar() {
            runOnUiThread(() -> {
                Lembretes.ativar(MainActivity.this);
                if (Build.VERSION.SDK_INT >= 33 && !Lembretes.permissao(MainActivity.this)) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQUEST_NOTIFICACAO);
                } else atualizarEstadoNaPagina();
            });
        }

        @JavascriptInterface public void desativar() {
            runOnUiThread(() -> {
                Lembretes.desativar(MainActivity.this);
                atualizarEstadoNaPagina();
            });
        }

        @JavascriptInterface public void testar() {
            runOnUiThread(() -> {
                if ("ativo".equals(Lembretes.estado(MainActivity.this)))
                    LembreteReceiver.mostrar(MainActivity.this, 999999,
                        "Este é um aviso de teste do Painel do Mandato.");
                atualizarEstadoNaPagina();
            });
        }
    }

    private void atualizarEstadoNaPagina() {
        if (web != null) web.evaluateJavascript(
            "if(window.atualizarEstadoLembretes)window.atualizarEstadoLembretes();", null);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_NOTIFICACAO) {
            if (Lembretes.permissao(this)) Lembretes.reagendar(this);
            atualizarEstadoNaPagina();
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (web != null && intent.getBooleanExtra("abrirAgenda", false)) web.loadUrl(AGENDA);
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception ignored) { }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_FILE && fileResult != null) {
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileResult.onReceiveValue(result);
            fileResult = null;
        }
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        if (web != null) web.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
