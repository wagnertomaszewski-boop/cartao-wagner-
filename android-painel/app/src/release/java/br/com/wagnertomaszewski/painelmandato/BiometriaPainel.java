package br.com.wagnertomaszewski.painelmandato;

/** Nenhuma biometria, armazenamento de sessão ou interface de teste na variante publicada. */
final class BiometriaPainel extends ProtecaoLocal {
    BiometriaPainel(android.app.Activity a, android.webkit.WebView w, android.widget.FrameLayout r){}
    boolean iniciar(){return false;}
    boolean bloqueada(){return false;}
    android.webkit.WebResourceResponse protegerOperacao(android.webkit.WebResourceRequest r){return null;}
    void pausar(){} void retomar(){} void parar(){} void fechar(){}
}
