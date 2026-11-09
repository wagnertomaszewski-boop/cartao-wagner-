package br.com.wagnertomaszewski.painelmandato;

import android.app.*;import android.content.SharedPreferences;import android.graphics.Color;
import android.hardware.biometrics.*;import android.hardware.fingerprint.FingerprintManager;import android.os.*;
import android.security.keystore.*;import android.util.Base64;import android.view.*;import android.webkit.*;import android.widget.*;
import org.json.*;import javax.net.ssl.HttpsURLConnection;import javax.crypto.Cipher;
import java.io.*;import java.net.URL;import java.security.*;import java.security.spec.X509EncodedKeySpec;import java.util.*;import java.util.concurrent.*;

/** Variante cidadã: não usa conta administrativa, cookie de sessão ou senha. */
@SuppressWarnings("deprecation")
final class BiometriaCidadao extends ProtecaoLocal {
    private static final String ORIGEM="https://mandato-neon-homologacao.onrender.com", TELA=ORIGEM+"/hml/v2/recuperar", PREFIXO="mandato_cidadao_hml_v1_";
    private final Activity activity;private final WebView web;private final FrameLayout root;private final SharedPreferences prefs;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private CancellationSignal cancelamento;private boolean segundoPlano=false,fechada=false,emPrompt=false,retornar=false;
    private final TentativasBiometricas tentativas=new TentativasBiometricas();private CredencialCidadao acesso;private long memoriaAte=0;
    BiometriaCidadao(Activity a,WebView w,FrameLayout r){activity=a;web=w;root=r;prefs=a.getSharedPreferences("biometria_cidadao_hml",0);}
    private int dp(int n){return (int)(n*activity.getResources().getDisplayMetrics().density);}
    boolean iniciar(){
        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        web.addJavascriptInterface(new Ponte(),"MandatoCidadaoBiometria");
        LinearLayout barra=new LinearLayout(activity);barra.setGravity(Gravity.CENTER_VERTICAL);barra.setBackgroundColor(Color.rgb(7,63,119));
        TextView t=new TextView(activity);t.setText("Mandato em Ação · Teste");t.setTextColor(Color.WHITE);t.setPadding(dp(10),0,0,0);barra.addView(t,new LinearLayout.LayoutParams(0,-1,1));
        Button b=new Button(activity);b.setText("Acompanhar");b.setOnClickListener(v->web.loadUrl(TELA));barra.addView(b);
        for(int i=0;i<root.getChildCount();i++){FrameLayout.LayoutParams p=(FrameLayout.LayoutParams)root.getChildAt(i).getLayoutParams();p.topMargin=dp(56);root.getChildAt(i).setLayoutParams(p);}
        root.addView(barra,new FrameLayout.LayoutParams(-1,dp(56),Gravity.TOP));return false;
    }
    private boolean contexto(){return !fechada&&!segundoPlano&&CredencialCidadao.telaPermitida(web.getUrl());}
    private boolean disponivel(){
        if(Build.VERSION.SDK_INT>=30)return activity.getSystemService(BiometricManager.class).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)==BiometricManager.BIOMETRIC_SUCCESS;
        if(Build.VERSION.SDK_INT==29)return activity.getSystemService(BiometricManager.class).canAuthenticate()==BiometricManager.BIOMETRIC_SUCCESS;
        if(Build.VERSION.SDK_INT==28){FingerprintManager f=activity.getSystemService(FingerprintManager.class);return f!=null&&f.isHardwareDetected()&&f.hasEnrolledFingerprints();}return false;
    }
    private final class Ponte {
        @JavascriptInterface public void ativar(String protocolo,String chave){activity.runOnUiThread(()->{if(!contexto()||emPrompt)return;if(!disponivel()){erro("Biometria forte indisponível. Continue com protocolo e chave.");return;}
            new AlertDialog.Builder(activity).setTitle("Guardar acesso neste aparelho?").setMessage("Protocolo e chave serão cifrados por até 24 horas. O servidor continuará validando cada consulta. Este acesso substituirá o acesso local anterior somente após a confirmação biométrica.")
                .setNegativeButton("Cancelar",(d,w)->erro("Ativação cancelada. O acesso manual foi preservado."))
                .setPositiveButton("Ativar biometria",(d,w)->prepararAtivacao(protocolo,chave)).show();});}
        @JavascriptInterface public void consultar(){activity.runOnUiThread(()->{if(contexto()&&!emPrompt)desbloquear();});}
        @JavascriptInterface public void operar(String acao,String arquivo){activity.runOnUiThread(()->{if(contexto()&&!emPrompt)operacao(acao,arquivo);});}
        @JavascriptInterface public void desativar(){activity.runOnUiThread(()->{if(!contexto())return;new AlertDialog.Builder(activity).setTitle("Remover acesso biométrico?").setMessage("Somente o acesso guardado neste aparelho será removido. Sua solicitação permanece no servidor.").setNegativeButton("Cancelar",null).setPositiveButton("Remover",(d,w)->{invalidarLocal();evento("desativada",new JSONObject());}).show();});}
    }
    private void prepararAtivacao(String protocolo,String chave){
        if(!contexto())return;acesso=null;memoriaAte=0;final long tarefa=tentativas.iniciar();
        executor.execute(()->{String alias=null;try{
            CredencialCidadao c=CredencialCidadao.nova(protocolo,chave,System.currentTimeMillis());consultarServidor(c);
            alias=PREFIXO+UUID.randomUUID();KeyPairGenerator g=KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA,"AndroidKeyStore");
            KeyGenParameterSpec.Builder spec=new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_DECRYPT).setKeySize(2048).setDigests(KeyProperties.DIGEST_SHA256,KeyProperties.DIGEST_SHA1).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP).setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true);
            if(Build.VERSION.SDK_INT>=30)spec.setUserAuthenticationParameters(0,KeyProperties.AUTH_BIOMETRIC_STRONG);else spec.setUserAuthenticationValidityDurationSeconds(-1);
            g.initialize(spec.build());KeyPair par=g.generateKeyPair();PublicKey publica=KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(par.getPublic().getEncoded()));
            byte[] segredo=c.codificar(),envelope;try{envelope=EnvelopeSessao.selar(segredo,publica);}finally{Arrays.fill(segredo,(byte)0);}
            Cipher cifra=EnvelopeSessao.rsa(Cipher.DECRYPT_MODE,par.getPrivate());final String novaAlias=alias;
            activity.runOnUiThread(()->{if(!tentativas.vigente(tarefa)||!contexto()){apagarChave(novaAlias);return;}prompt(envelope,novaAlias,cifra,true);});
        }catch(AcessoInvalido e){final String a=alias;activity.runOnUiThread(()->{apagarChave(a);if(tentativas.vigente(tarefa)&&contexto())erro("Protocolo ou chave recusados pelo servidor. Nenhum acesso foi guardado.");});}
         catch(Exception e){final String a=alias;activity.runOnUiThread(()->{apagarChave(a);if(tentativas.vigente(tarefa)&&contexto())erro("Não foi possível ativar a biometria. Use o acesso manual.");});}});
    }
    private void desbloquear(){
        acesso=null;memoriaAte=0;
        if(!disponivel()){erro("Biometria indisponível. Use protocolo e chave.");return;}
        try{String alias=prefs.getString("alias","");if(!alias.matches(PREFIXO+"[0-9a-f-]{36}"))throw new GeneralSecurityException();byte[] envelope=Base64.decode(prefs.getString("envelope",""),Base64.NO_WRAP);EnvelopeSessao.ler(envelope);
            PrivateKey privada=(PrivateKey)chaves().getKey(alias,null);if(privada==null)throw new GeneralSecurityException();prompt(envelope,alias,EnvelopeSessao.rsa(Cipher.DECRYPT_MODE,privada),false);
        }catch(Exception e){invalidarLocal();erro("Não há acesso biométrico válido neste aparelho. Valide protocolo e chave e ative novamente.");}
    }
    private void prompt(byte[] envelope,String alias,Cipher cifra,boolean ativacao){
        final long tentativa=tentativas.iniciar();emPrompt=true;cancelamento=new CancellationSignal();
        BiometricPrompt.Builder b=new BiometricPrompt.Builder(activity).setTitle(ativacao?"Proteger acompanhamento":"Abrir acompanhamento privado").setSubtitle("Homologação · validação obrigatória no servidor")
            .setNegativeButton("Cancelar",activity.getMainExecutor(),(d,w)->{if(tentativas.vigente(tentativa))cancelar(ativacao,alias);});
        if(Build.VERSION.SDK_INT>=30)b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        try{b.build().authenticate(new BiometricPrompt.CryptoObject(cifra),cancelamento,activity.getMainExecutor(),new BiometricPrompt.AuthenticationCallback(){
            @Override public void onAuthenticationFailed(){if(tentativas.vigente(tentativa)&&contexto())erro("Biometria não reconhecida. Nenhum acesso foi liberado.");}
            @Override public void onAuthenticationError(int codigo,CharSequence motivo){if(tentativas.vigente(tentativa))cancelar(ativacao,alias);else if(ativacao)apagarChave(alias);}
            @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r){
                if(!tentativas.vigente(tentativa)||!emPrompt||!contexto()){if(ativacao)apagarChave(alias);return;}emPrompt=false;cancelamento=null;final long tarefa=tentativas.iniciar();
                executor.execute(()->{byte[] bytes=null;try{
                    Cipher autenticado=r.getCryptoObject()==null?null:r.getCryptoObject().getCipher();if(autenticado==null)throw new GeneralSecurityException();bytes=EnvelopeSessao.abrir(EnvelopeSessao.ler(envelope),autenticado);
                    CredencialCidadao c=CredencialCidadao.ler(bytes);if(!c.vigente(System.currentTimeMillis()))throw new AcessoInvalido();JSONObject dto=consultarServidor(c);
                    activity.runOnUiThread(()->{if(!tentativas.vigente(tarefa)||!contexto()){if(ativacao)apagarChave(alias);return;}
                        if(ativacao){String anterior=prefs.getString("alias",null);if(!prefs.edit().putString("alias",alias).putString("envelope",Base64.encodeToString(envelope,Base64.NO_WRAP)).commit()){apagarChave(alias);erro("Não foi possível guardar o acesso.");return;}if(!alias.equals(anterior))apagarChave(anterior);evento("ativada",new JSONObject());}
                        else {acesso=c;memoriaAte=System.currentTimeMillis()+120000;evento("consulta",dto);}
                    });
                }catch(AcessoInvalido e){activity.runOnUiThread(()->{if(ativacao)apagarChave(alias);if(tentativas.vigente(tarefa)&&contexto()){if(!ativacao)invalidarLocal();erro("Acesso expirado ou revogado. Informe protocolo e chave novamente.");}});}
                 catch(GeneralSecurityException e){activity.runOnUiThread(()->{if(ativacao)apagarChave(alias);if(tentativas.vigente(tarefa)&&contexto()){if(!ativacao)invalidarLocal();erro("Proteção do aparelho alterada. Valide protocolo e chave novamente.");}});}
                 catch(Exception e){activity.runOnUiThread(()->{if(ativacao)apagarChave(alias);if(tentativas.vigente(tarefa)&&contexto())erro("Não foi possível confirmar o acesso. Verifique a conexão ou consulte manualmente.");});}
                 finally{if(bytes!=null)Arrays.fill(bytes,(byte)0);}
                });
            }
        });}catch(RuntimeException e){cancelar(ativacao,alias);}
    }
    private void cancelar(boolean ativacao,String alias){tentativas.cancelar();emPrompt=false;cancelamento=null;if(ativacao)apagarChave(alias);erro("Biometria cancelada ou indisponível. O acesso manual continua disponível.");}
    private JSONObject consultarServidor(CredencialCidadao c)throws Exception{JSONObject d=requisitar("/hml/cidadao/consultar",corpo(c));if(!d.optBoolean("encontrado"))throw new AcessoInvalido();return d;}
    private JSONObject corpo(CredencialCidadao c)throws JSONException{return new JSONObject().put("protocolo",c.protocolo).put("chave",c.chave);}
    private void operacao(String acao,String arquivo){
        if(!Arrays.asList("qr","leitura","baixar").contains(acao)){erro("Operação não autorizada.");return;}
        if(acesso==null||!acesso.vigente(System.currentTimeMillis())||System.currentTimeMillis()>=memoriaAte){acesso=null;erro("Desbloqueie novamente com biometria ou consulte com protocolo e chave.");return;}
        if(acao.equals("baixar")&&(arquivo==null||!arquivo.matches("[0-9a-f-]{36}"))){erro("Arquivo inválido.");return;}
        final CredencialCidadao c=acesso;final long tarefa=tentativas.iniciar();
        executor.execute(()->{try{JSONObject d=corpo(c);String rota=acao.equals("qr")?"/hml/cidadao/qr":acao.equals("leitura")?"/hml/cidadao/confirmar-leitura":"/hml/cidadao/arquivo/baixar";if(acao.equals("baixar"))d.put("arquivoId",arquivo);JSONObject r=requisitar(rota,d);activity.runOnUiThread(()->{if(tentativas.vigente(tarefa)&&contexto()){if(acao.equals("baixar")&&activity instanceof MainActivity){((MainActivity)activity).salvarArquivoHml(r.optString("nome"),r.optString("mime"),r.optString("base64"));evento("arquivo-preparado",new JSONObject());}else evento(acao,r);}});}
            catch(AcessoInvalido e){activity.runOnUiThread(()->{if(tentativas.vigente(tarefa)&&contexto()){invalidarLocal();erro("Acesso revogado ou inválido. Consulte manualmente novamente.");}});}
            catch(Exception e){activity.runOnUiThread(()->{if(tentativas.vigente(tarefa)&&contexto())erro("Não foi possível concluir. Tente novamente.");});}});
    }
    private JSONObject requisitar(String path,JSONObject corpo)throws Exception{
        HttpsURLConnection c=(HttpsURLConnection)new URL(ORIGEM+path).openConnection();c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setInstanceFollowRedirects(false);c.setUseCaches(false);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Origin",ORIGEM);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Cache-Control","no-store");
        try{byte[] envio=corpo.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);try(OutputStream out=c.getOutputStream()){out.write(envio);}finally{Arrays.fill(envio,(byte)0);}int status=c.getResponseCode();if(status==401||status==403)throw new AcessoInvalido();if(status!=200)throw new IOException();ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>1500000)throw new IOException();out.write(b,0,n);}}return new JSONObject(out.toString("UTF-8"));}finally{c.disconnect();}
    }
    private void evento(String tipo,JSONObject dado){if(!contexto())return;try{JSONObject e=new JSONObject().put("tipo",tipo).put("resultado",dado);web.evaluateJavascript("window.dispatchEvent(new CustomEvent('mandato-biometria-cidadao',{detail:"+e.toString()+"}));",null);}catch(JSONException ignored){}}
    private void erro(String mensagem){try{evento("erro",new JSONObject().put("mensagem",mensagem));}catch(JSONException ignored){}}
    private KeyStore chaves()throws Exception{KeyStore k=KeyStore.getInstance("AndroidKeyStore");k.load(null);return k;}
    private void apagarChave(String alias){if(alias==null||!alias.startsWith(PREFIXO))return;try{KeyStore k=chaves();if(k.containsAlias(alias))k.deleteEntry(alias);}catch(Exception ignored){}}
    private void invalidarLocal(){tentativas.cancelar();acesso=null;memoriaAte=0;String alias=prefs.getString("alias",null);prefs.edit().clear().commit();apagarChave(alias);}
    void navegacao(String url){tentativas.cancelar();acesso=null;memoriaAte=0;if(cancelamento!=null)cancelamento.cancel();cancelamento=null;emPrompt=false;}
    boolean bloqueada(){return false;}
    WebResourceResponse protegerOperacao(WebResourceRequest r){return null;}
    void pausar(){segundoPlano=true;web.setVisibility(View.INVISIBLE);}
    void retomar(){segundoPlano=false;web.setVisibility(View.VISIBLE);if(retornar){retornar=false;web.loadUrl(TELA);}}
    void parar(){tentativas.cancelar();acesso=null;memoriaAte=0;if(cancelamento!=null)cancelamento.cancel();cancelamento=null;emPrompt=false;retornar=true;web.stopLoading();web.loadUrl("about:blank");web.clearHistory();web.clearCache(true);}
    void fechar(){fechada=true;tentativas.fechar();acesso=null;if(cancelamento!=null)cancelamento.cancel();executor.shutdownNow();}
    private static final class AcessoInvalido extends Exception{}
}
