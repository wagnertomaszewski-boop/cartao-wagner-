package br.com.wagnertomaszewski.painelmandato;

abstract class ProtecaoLocal {
    abstract boolean iniciar();
    void navegacao(String url){}
    void paginaPronta(){}
    void invalidar(){}
    abstract boolean bloqueada();
    abstract android.webkit.WebResourceResponse protegerOperacao(android.webkit.WebResourceRequest r);
    abstract void pausar(); abstract void retomar(); abstract void parar(); abstract void fechar();
}
