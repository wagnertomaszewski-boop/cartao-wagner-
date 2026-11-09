package br.com.wagnertomaszewski.painelmandato;

import android.app.*;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.hardware.biometrics.*;
import android.hardware.fingerprint.FingerprintManager;
import android.os.*;
import android.security.keystore.*;
import android.util.Base64;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;
import java.util.concurrent.*;
import javax.crypto.Cipher;

/** Controle nativo exclusivo de homologação. Nenhuma senha ou biometria é recebida por esta classe. */
@SuppressWarnings("deprecation")
final class BiometriaPainel {
    private static final String ORIGEM="https://mandato-neon-homologacao.onrender.com";
    private static final String LOGIN=ORIGEM+"/hml/", HOME=ORIGEM+"/hml/painel/recuperacoes";
    private static final String ALIAS="mandato_hml_biometria_v1", REGISTRO="sessao_cifrada_v1";
    private final Activity activity; private final WebView web; private final FrameLayout root;
    private final SharedPreferences prefs; private final ExecutorService trabalho=Executors.newSingleThreadExecutor();
    private final PoliticaBiometria politica=new PoliticaBiometria();
    private LinearLayout bloqueio; private TextView mensagem; private Button configurar;
    private CancellationSignal cancelamento; private boolean encerrada=false,emPrompt=false,ativa=false,segundoPlano=false;
    private volatile boolean retomadaBiometrica=false;
    private final java.util.concurrent.atomic.AtomicBoolean avisoOperacao=new java.util.concurrent.atomic.AtomicBoolean(false);
    private int sequencia=0;
    BiometriaPainel(Activity a,WebView w,FrameLayout r){activity=a;web=w;root=r;prefs=a.getSharedPreferences("biometria_hml",0);}
    private int dp(int n){return (int)(n*activity.getResources().getDisplayMetrics().density);}
    boolean iniciar(){
        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        LinearLayout barra=new LinearLayout(activity);barra.setGravity(Gravity.CENTER_VERTICAL);barra.setPadding(dp(10),0,dp(6),0);barra.setBackgroundColor(Color.rgb(7,63,119));
        TextView titulo=new TextView(activity);titulo.setText("Painel · Homologação");titulo.setTextColor(Color.WHITE);barra.addView(titulo,new LinearLayout.LayoutParams(0,-1,1));
        configurar=new Button(activity);configurar.setText("Biometria");configurar.setOnClickListener(v->opcoes());barra.addView(configurar);
        FrameLayout.LayoutParams topo=new FrameLayout.LayoutParams(-1,dp(56),Gravity.TOP);root.addView(barra,topo);
        for(int i=0;i<root.getChildCount();i++){View v=root.getChildAt(i);if(v!=barra){FrameLayout.LayoutParams p=(FrameLayout.LayoutParams)v.getLayoutParams();p.topMargin=dp(56);v.setLayoutParams(p);}}
        ativa=prefs.contains(REGISTRO);
        if(ativa){mostrarBloqueio("Sessão protegida. Use biometria ou entre novamente com senha e MFA.");limparNavegador(null);return true;}
        return false;
    }
    boolean bloqueada(){return bloqueio!=null;}
    private void opcoes(){
        if(Build.VERSION.SDK_INT<28){informar("Biometria de homologação disponível a partir do Android 9. Continue com senha e MFA.");return;}
        new AlertDialog.Builder(activity).setTitle("Biometria opcional")
          .setMessage(ativa?"Desativar a biometria apaga a sessão protegida deste aparelho e exige novo login.":"Ative depois do login completo com MFA. A biometria não renova a sessão nem substitui as verificações administrativas do servidor.")
          .setNegativeButton("Cancelar",null)
          .setPositiveButton(ativa?"Desativar e entrar novamente":"Ativar após MFA",(d,w)->{if(ativa)loginCompleto("Biometria desativada.");else ativar();}).show();
    }
    private boolean disponivel(){
        if(Build.VERSION.SDK_INT>=30)return activity.getSystemService(BiometricManager.class).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)==BiometricManager.BIOMETRIC_SUCCESS;
        if(Build.VERSION.SDK_INT==29)return activity.getSystemService(BiometricManager.class).canAuthenticate()==BiometricManager.BIOMETRIC_SUCCESS;
        if(Build.VERSION.SDK_INT==28){FingerprintManager f=activity.getSystemService(FingerprintManager.class);return f!=null&&f.isHardwareDetected()&&f.hasEnrolledFingerprints();}
        return false;
    }
    private void ativar(){
        if(!PoliticaBiometria.origemPermitida(web.getUrl())||!disponivel()){informar("Biometria forte indisponível ou não cadastrada. Use senha e MFA.");return;}
        final String cookie=PoliticaBiometria.cookieSessao(CookieManager.getInstance().getCookie(ORIGEM+"/hml/api/estado"));
        if(cookie==null){informar("Faça o login completo e confirme o MFA antes de ativar.");return;}
        mostrarBloqueio("Conferindo login e MFA com o servidor…");final int tarefa=++sequencia;
        trabalho.execute(()->{try{
            boolean[] estado=estadoServidor(cookie);
            if(!estado[0]||!estado[1]||!estado[2]){naTela(tarefa,()->loginCompleto("Faça novo login completo com MFA antes de ativar a biometria."));return;}
            KeyStore ks=chaves();if(ks.containsAlias(ALIAS))ks.deleteEntry(ALIAS);
            KeyPairGenerator gerador=KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA,"AndroidKeyStore");
            KeyGenParameterSpec.Builder spec=new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(2048).setDigests(KeyProperties.DIGEST_SHA256,KeyProperties.DIGEST_SHA1)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
                .setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true);
            if(Build.VERSION.SDK_INT>=30)spec.setUserAuthenticationParameters(0,KeyProperties.AUTH_BIOMETRIC_STRONG);
            else spec.setUserAuthenticationValidityDurationSeconds(-1);
            gerador.initialize(spec.build());KeyPair par=gerador.generateKeyPair();
            PublicKey publica=KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(par.getPublic().getEncoded()));
            byte[] segredo=cookie.getBytes(StandardCharsets.UTF_8),envelope;
            try{envelope=EnvelopeSessao.selar(segredo,publica);}finally{Arrays.fill(segredo,(byte)0);}
            Cipher cifra=EnvelopeSessao.rsa(Cipher.DECRYPT_MODE,par.getPrivate());
            naTela(tarefa,()->autenticar(envelope,cifra,true));
        }catch(Exception e){naTela(tarefa,()->{removerProtecao();ocultarBloqueio();informar("Não foi possível ativar a proteção do dispositivo. Continue com senha e MFA.");});}});
    }
    private void desbloquear(){
        if(!ativa||!disponivel()){loginCompleto("Biometria indisponível ou alterada. Entre novamente com senha e MFA.");return;}
        try{
            byte[] envelope=Base64.decode(prefs.getString(REGISTRO,""),Base64.NO_WRAP);EnvelopeSessao.ler(envelope);
            PrivateKey privada=(PrivateKey)chaves().getKey(ALIAS,null);
            if(privada==null)throw new GeneralSecurityException();
            autenticar(envelope,EnvelopeSessao.rsa(Cipher.DECRYPT_MODE,privada),false);
        }catch(Exception e){politica.chaveInvalidada();loginCompleto("Proteção biométrica alterada ou inválida. Entre com senha e MFA e ative novamente.");}
    }
    private void autenticar(byte[] envelope,Cipher cifra,boolean ativacao){
        if(Build.VERSION.SDK_INT<28)return;emPrompt=true;final int tentativa=++sequencia;
        BiometricPrompt.Builder builder=new BiometricPrompt.Builder(activity).setTitle(ativacao?"Ativar biometria de teste":"Desbloquear Painel de teste")
            .setSubtitle("Sessão de homologação protegida pelo Android Keystore")
            .setNegativeButton("Cancelar",activity.getMainExecutor(),(d,w)->{if(tentativa==sequencia)cancelar(ativacao);});
        if(Build.VERSION.SDK_INT>=30)builder.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        cancelamento=new CancellationSignal();
        try { builder.build().authenticate(new BiometricPrompt.CryptoObject(cifra),cancelamento,activity.getMainExecutor(),new BiometricPrompt.AuthenticationCallback(){
            @Override public void onAuthenticationFailed(){if(tentativa!=sequencia||!emPrompt)return;politica.canceladaOuFalhou();texto("Biometria não reconhecida. Tente novamente ou use senha e MFA.");}
            @Override public void onAuthenticationError(int codigo,CharSequence detalhe){if(tentativa!=sequencia)return;emPrompt=false;cancelamento=null;cancelar(ativacao);}
            @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult resultado){
                if(tentativa!=sequencia||!emPrompt)return;emPrompt=false;cancelamento=null;if(segundoPlano||encerrada){politica.bloquear();return;}final int tarefa=++sequencia;texto("Validando a sessão protegida com o servidor…");
                trabalho.execute(()->{byte[] bytes=null;try{
                    Cipher autenticado=resultado.getCryptoObject()==null?null:resultado.getCryptoObject().getCipher();if(autenticado==null)throw new GeneralSecurityException();
                    bytes=EnvelopeSessao.abrir(EnvelopeSessao.ler(envelope),autenticado);
                    String cookie=PoliticaBiometria.cookieSessao(new String(bytes,StandardCharsets.UTF_8));if(cookie==null)throw new GeneralSecurityException();
                    boolean[] estado=estadoServidor(cookie);
                    naTela(tarefa,()->{
                        if(!politica.validarServidor(estado[0],estado[1],estado[2])){loginCompleto("Sessão expirada, revogada ou MFA sem validade recente. Faça login completo novamente.");return;}
                        if(ativacao){if(!prefs.edit().putString(REGISTRO,Base64.encodeToString(envelope,Base64.NO_WRAP)).commit()){loginCompleto("Não foi possível guardar a sessão protegida.");return;}ativa=true;}
                        retomadaBiometrica=!ativacao;
                        restaurarCookie(cookie,tarefa);informar(ativacao?"Biometria ativada. Senha e MFA continuam obrigatórios quando exigidos.":"Sessão válida desbloqueada. A biometria não renovou o MFA.");
                    });
                }catch(IOException e){naTela(tarefa,()->texto("Sem confirmação do servidor. O painel permanece bloqueado. Verifique a conexão ou use senha e MFA."));}
                 catch(Exception e){naTela(tarefa,()->loginCompleto("Não foi possível abrir a sessão protegida. Faça login completo e ative novamente."));}
                 finally{if(bytes!=null)Arrays.fill(bytes,(byte)0);}
                });
            }
        }); } catch(RuntimeException e) {cancelamento=null;cancelar(ativacao);informar("Biometria indisponível. Use senha e MFA.");}
    }
    private void cancelar(boolean ativacao){
        ++sequencia;politica.canceladaOuFalhou();emPrompt=false;
        if(ativacao){removerProtecao();if(segundoPlano){mostrarBloqueio("Ativação interrompida. Entre novamente com senha e MFA.");limparNavegador(null);}else{ocultarBloqueio();informar("Ativação cancelada. O login tradicional foi mantido.");}}
        else texto("Desbloqueio cancelado. O painel continua bloqueado; você pode tentar novamente ou usar senha e MFA.");
    }
    private boolean[] estadoServidor(String cookie) throws IOException {
        HttpsURLConnection c=(HttpsURLConnection)new URL(ORIGEM+"/hml/api/estado").openConnection();
        c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setInstanceFollowRedirects(false);c.setUseCaches(false);
        c.setRequestProperty("Cookie",cookie);c.setRequestProperty("Cache-Control","no-store");
        try{
            if(c.getResponseCode()!=200)throw new IOException("Servidor não confirmou a sessão");
            ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] buf=new byte[512];int n;while((n=in.read(buf))!=-1){if(out.size()+n>4096)throw new IOException();out.write(buf,0,n);}}
            JSONObject e=new JSONObject(out.toString("UTF-8"));if(!"homologacao".equals(e.optString("ambiente")))throw new IOException();
            return new boolean[]{e.optBoolean("autenticado"),e.optBoolean("mfaAtivado"),e.optBoolean("mfaRecente")};
        }catch(org.json.JSONException e){throw new IOException("Resposta inválida");}finally{c.disconnect();}
    }
    private KeyStore chaves() throws GeneralSecurityException,IOException {KeyStore k=KeyStore.getInstance("AndroidKeyStore");try{k.load(null);}catch(java.security.cert.CertificateException e){throw new GeneralSecurityException(e);}return k;}
    private void restaurarCookie(String cookie,int tarefa){
        CookieManager cm=CookieManager.getInstance();cm.removeAllCookies(ok->{
            if(encerrada||segundoPlano||tarefa!=sequencia)return;
            // Cookie de sessão em memória; o único checkpoint persistente próprio é cifrado no Keystore.
            cm.setCookie(ORIGEM,cookie+"; Path=/; Secure; HttpOnly; SameSite=Strict",feito->{
                if(encerrada||segundoPlano||tarefa!=sequencia){cm.removeAllCookies(null);cm.flush();return;}
                if(!Boolean.TRUE.equals(feito)){loginCompleto("Entre novamente para continuar.");return;}
                ocultarBloqueio();web.loadUrl(HOME);
            });
        });
    }
    private void loginCompleto(String motivo){++sequencia;if(cancelamento!=null)cancelamento.cancel();cancelamento=null;emPrompt=false;retomadaBiometrica=false;avisoOperacao.set(false);removerProtecao();politica.bloquear();limparNavegador(()->{ocultarBloqueio();web.loadUrl(LOGIN);informar(motivo);});}
    private void removerProtecao(){ativa=false;prefs.edit().remove(REGISTRO).commit();try{KeyStore k=chaves();if(k.containsAlias(ALIAS))k.deleteEntry(ALIAS);}catch(Exception ignored){}}
    private void limparNavegador(Runnable depois){web.stopLoading();web.loadUrl("about:blank");web.clearHistory();web.clearCache(true);CookieManager.getInstance().removeAllCookies(ok->{CookieManager.getInstance().flush();if(depois!=null&&!encerrada)depois.run();});}
    private void mostrarBloqueio(String texto){
        web.setVisibility(View.INVISIBLE);politica.bloquear();
        if(bloqueio==null){
            bloqueio=new LinearLayout(activity);bloqueio.setOrientation(LinearLayout.VERTICAL);bloqueio.setGravity(Gravity.CENTER);bloqueio.setPadding(dp(24),dp(16),dp(24),dp(16));bloqueio.setBackgroundColor(Color.WHITE);
            mensagem=new TextView(activity);mensagem.setTextColor(Color.rgb(7,45,82));mensagem.setTextSize(18);bloqueio.addView(mensagem);
            Button usar=new Button(activity);usar.setText("Desbloquear com biometria");usar.setOnClickListener(v->{if(!emPrompt&&ativa)desbloquear();});bloqueio.addView(usar);
            Button senha=new Button(activity);senha.setText("Entrar com senha e MFA");senha.setOnClickListener(v->{if(cancelamento!=null)cancelamento.cancel();++sequencia;loginCompleto("Use seu login exclusivo de homologação e o autenticador.");});bloqueio.addView(senha);
            FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(-1,-1);p.topMargin=dp(56);root.addView(bloqueio,p);
        }
        mensagem.setText(texto);
    }
    private void texto(String texto){if(bloqueio==null)mostrarBloqueio(texto);else mensagem.setText(texto);}
    private void ocultarBloqueio(){if(bloqueio!=null){root.removeView(bloqueio);bloqueio=null;mensagem=null;}web.setVisibility(View.VISIBLE);}
    private void informar(String texto){Toast.makeText(activity,texto,Toast.LENGTH_LONG).show();}
    private void naTela(int tarefa,Runnable r){activity.runOnUiThread(()->{if(!encerrada&&tarefa==sequencia)r.run();});}
    WebResourceResponse protegerOperacao(WebResourceRequest pedido){
        if(!PoliticaBiometria.exigeLoginCompleto(retomadaBiometrica,pedido.getMethod(),pedido.getUrl().toString()))return null;
        if(avisoOperacao.compareAndSet(false,true))activity.runOnUiThread(()->{
            if(encerrada)return;
            new AlertDialog.Builder(activity).setTitle("Autenticação completa necessária")
                .setMessage("A biometria reabriu a sessão. Para aprovar, emitir códigos ou alterar dados, entre novamente com senha e MFA.")
                .setNegativeButton("Cancelar",(d,w)->avisoOperacao.set(false))
                .setPositiveButton("Entrar com senha e MFA",(d,w)->loginCompleto("Faça o login completo antes de executar operações administrativas."))
                .setOnCancelListener(d->avisoOperacao.set(false)).show();
        });
        byte[] corpo="{\"erro\":\"Entre novamente com senha e MFA para esta operação.\"}".getBytes(StandardCharsets.UTF_8);
        return new WebResourceResponse("application/json","UTF-8",403,"Reauthentication required",java.util.Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(corpo));
    }
    void pausar(){segundoPlano=true;if(ativa||emPrompt)web.setVisibility(View.INVISIBLE);}
    void retomar(){segundoPlano=false;if(!bloqueada())web.setVisibility(View.VISIBLE);}
    void parar(){if(ativa||emPrompt||bloqueada()){++sequencia;if(cancelamento!=null)cancelamento.cancel();cancelamento=null;emPrompt=false;mostrarBloqueio("Painel bloqueado ao sair do aplicativo.");limparNavegador(null);}}
    void fechar(){encerrada=true;++sequencia;if(cancelamento!=null)cancelamento.cancel();trabalho.shutdownNow();}
}
