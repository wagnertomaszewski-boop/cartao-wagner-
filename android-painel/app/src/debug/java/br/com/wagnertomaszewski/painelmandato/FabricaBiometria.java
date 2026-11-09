package br.com.wagnertomaszewski.painelmandato;
final class FabricaBiometria {
    static ProtecaoLocal criar(android.app.Activity a,android.webkit.WebView w,android.widget.FrameLayout r){
        return BuildConfig.CIDADAO_HML?new BiometriaCidadao(a,w,r):new BiometriaPainel(a,w,r);
    }
}
