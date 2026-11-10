package br.com.wagnertomaszewski.painelmandato;

import android.app.Activity;
import android.app.AlertDialog;
import android.webkit.GeolocationPermissions;
import android.util.Base64;
import java.io.OutputStream;
import android.widget.Toast;
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
    private static final String HOME = BuildConfig.CIDADAO_HML ? "https://mandato-neon-homologacao.onrender.com/hml/v2/index.html" : BuildConfig.HOMOLOGACAO ? "https://mandato-neon-homologacao.onrender.com/hml/painel/recuperacoes" : "https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/index.html";
    private static final String AGENDA = BuildConfig.HOMOLOGACAO ? HOME : "https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/agenda.html";
    private static final int REQUEST_NOTIFICACAO = 2005;
    private static final String ALLOWED_PREFIX = BuildConfig.HOMOLOGACAO ? "https://mandato-neon-homologacao.onrender.com/hml/" : "https://wagnertomaszewski-boop.github.io/cartao-wagner-/";
    private static final int REQUEST_FILE = 2011;
    private static final int REQUEST_LOCALIZACAO_HML = 2013;
    private static final int REQUEST_SALVAR_HML = 2014;
    private GeolocationPermissions.Callback geoPendente;
    private String geoOrigem;
    private byte[] arquivoPendente;
    private ProtecaoLocal biometria;
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
        status.setText(BuildConfig.CIDADAO_HML ? "Carregando Mandato em Ação…" : "Carregando Painel do Mandato…");
        status.setTextColor(Color.WHITE);
        status.setTextSize(16);
        status.setGravity(android.view.Gravity.CENTER);
        root.addView(status, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(!BuildConfig.HOMOLOGACAO);
        if(BuildConfig.BIOMETRIA_PLAY) settings.setUserAgentString(settings.getUserAgentString()+" MandatoPainelBiometria/1");
        settings.setDatabaseEnabled(!BuildConfig.HOMOLOGACAO && !BuildConfig.BIOMETRIA_PLAY);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(BuildConfig.HOMOLOGACAO ? WebSettings.LOAD_NO_CACHE : WebSettings.LOAD_DEFAULT);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        if (!BuildConfig.CIDADAO_HML) web.addJavascriptInterface(new PonteLembretes(), "MandatoLembretes");
        if (BuildConfig.HOMOLOGACAO) web.addJavascriptInterface(new PonteArquivosHml(), "MandatoArquivos");
        CookieManager.getInstance().setAcceptCookie(!BuildConfig.CIDADAO_HML);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);

        web.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return biometria == null ? null : biometria.protegerOperacao(request);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                if(BuildConfig.BIOMETRIA_PLAY && request.isForMainFrame() && "mandato-painel://sair".equals(url)){biometria.invalidar();return true;}
                if (url.startsWith(ALLOWED_PREFIX) && "https".equals(uri.getScheme()) && (!BuildConfig.CIDADAO_HML || url.startsWith(ALLOWED_PREFIX+"v2/") || url.equals(ALLOWED_PREFIX+"mandato/solicitar"))) {
                    return false;
                }
                if (!BuildConfig.HOMOLOGACAO || (request.hasGesture() && ("whatsapp".equals(uri.getScheme()) || NavegacaoMapaHml.permitida(url)))) openExternal(uri);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                status.setVisibility(View.VISIBLE);
                if (biometria != null) biometria.navegacao(url);
            }
            @Override public void onPageFinished(WebView view, String url) {
                status.setVisibility(View.GONE);
                if(biometria!=null)biometria.paginaPronta();
            }
            @Override public void onReceivedError(WebView view,
                WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    status.setText(BuildConfig.CIDADAO_HML ? "Não foi possível conectar ao Mandato em Ação.\nVerifique sua internet e tente novamente." : "Não foi possível conectar ao Painel do Mandato.\nVerifique sua internet e tente novamente.");
                    status.setVisibility(View.VISIBLE);
                    status.setOnClickListener(v -> {
                        status.setText(BuildConfig.CIDADAO_HML ? "Carregando Mandato em Ação…" : "Carregando Painel do Mandato…");
                        web.reload();
                    });
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!BuildConfig.HOMOLOGACAO || !("https://mandato-neon-homologacao.onrender.com".equals(origin) || "https://mandato-neon-homologacao.onrender.com/".equals(origin)) || geoPendente != null) {
                    callback.invoke(origin, false, false); return;
                }
                geoPendente = callback; geoOrigem = origin;
                new AlertDialog.Builder(MainActivity.this).setTitle("Localização no teste")
                    .setMessage("Permitir a localização somente para esta solicitação no ambiente de homologação?")
                    .setNegativeButton("Não permitir", (d,w) -> finalizarLocalizacao(false))
                    .setPositiveButton("Permitir", (d,w) -> {
                        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) finalizarLocalizacao(true);
                        else requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_LOCALIZACAO_HML);
                    }).setOnCancelListener(d -> finalizarLocalizacao(false)).show();
            }
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
            if (!BuildConfig.HOMOLOGACAO && url.startsWith("https://")) openExternal(Uri.parse(url));
        });
        biometria = FabricaBiometria.criar(this, web, root);
        boolean protegido = biometria.iniciar();
        if (protegido) return;
        if (savedInstanceState == null || BuildConfig.HOMOLOGACAO) web.loadUrl(
            getIntent().getBooleanExtra("abrirAgenda", false) ? AGENDA : HOME);
        else web.restoreState(savedInstanceState);
    }

    private void finalizarLocalizacao(boolean autorizado) {
        if (geoPendente != null) geoPendente.invoke(geoOrigem, autorizado, false);
        geoPendente = null; geoOrigem = null;
    }

    void salvarArquivoHml(String nome,String mime,String base64) { new PonteArquivosHml().salvar(nome,mime,base64); }

    private final class PonteArquivosHml {
        @JavascriptInterface public void salvar(String nome, String mime, String base64) {
            if (!BuildConfig.HOMOLOGACAO || nome == null || nome.length() > 150 || base64 == null || base64.length() > 1400000) return;
            if (!("image/png".equals(mime) || "image/jpeg".equals(mime) || "application/pdf".equals(mime) || "text/csv".equals(mime))) return;
            if (nome.contains("/") || nome.contains("\\") || java.util.regex.Pattern.compile("[\\x00-\\x1f\\x7f]").matcher(nome).find()) return;
            String minusculo = nome.toLowerCase(java.util.Locale.ROOT);
            if (("image/png".equals(mime) && !minusculo.endsWith(".png")) || ("image/jpeg".equals(mime) && !(minusculo.endsWith(".jpg") || minusculo.endsWith(".jpeg"))) || ("application/pdf".equals(mime) && !minusculo.endsWith(".pdf")) || ("text/csv".equals(mime) && !minusculo.endsWith(".csv"))) return;
            final byte[] bytes;
            try { bytes = Base64.decode(base64, Base64.DEFAULT); } catch (IllegalArgumentException e) { return; }
            if (bytes.length < 8 || bytes.length > 1048576) return;
            runOnUiThread(() -> {
                if (web == null || web.getUrl() == null || !web.getUrl().startsWith("https://mandato-neon-homologacao.onrender.com/hml/") || arquivoPendente != null) return;
                arquivoPendente = bytes;
                Intent criar = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE, nome);
                try { startActivityForResult(criar, REQUEST_SALVAR_HML); }
                catch (ActivityNotFoundException e) { arquivoPendente = null; Toast.makeText(MainActivity.this, "Não foi possível abrir o diálogo de arquivo.", Toast.LENGTH_LONG).show(); }
            });
        }
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
        if (requestCode == REQUEST_LOCALIZACAO_HML) {
            boolean autorizado = false;
            for (int resultado : grantResults) autorizado |= resultado == PackageManager.PERMISSION_GRANTED;
            finalizarLocalizacao(autorizado);
        }
        if (requestCode == REQUEST_NOTIFICACAO) {
            if (Lembretes.permissao(this)) Lembretes.reagendar(this);
            atualizarEstadoNaPagina();
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (web != null && !biometria.bloqueada() && intent.getBooleanExtra("abrirAgenda", false)) web.loadUrl(AGENDA);
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception ignored) { }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_SALVAR_HML) {
            byte[] bytes = arquivoPendente; arquivoPendente = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                try (OutputStream destino = getContentResolver().openOutputStream(data.getData())) {
                    if (destino == null) throw new java.io.IOException();
                    destino.write(bytes);
                    Toast.makeText(this, "Arquivo salvo no destino escolhido.", Toast.LENGTH_LONG).show();
                } catch (Exception e) { Toast.makeText(this, "Não foi possível salvar o arquivo.", Toast.LENGTH_LONG).show(); }
            }
        }
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

    @Override protected void onPause() { if (biometria != null) biometria.pausar(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (biometria != null) biometria.retomar(); }
    @Override protected void onStop() { if (biometria != null) biometria.parar(); super.onStop(); }

    @Override public void onBackPressed() {
        if (biometria != null && biometria.bloqueada()) return;
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (biometria != null) biometria.fechar();
        finalizarLocalizacao(false); arquivoPendente = null;
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
