package br.com.wagnertomaszewski.painelmandato;
/** Rejeita respostas antigas após cancelamento, navegação, segundo plano ou destruição. */
final class TentativasBiometricas {
    private long geracao=0;private boolean fechada=false;
    synchronized long iniciar(){return ++geracao;}
    synchronized void cancelar(){++geracao;}
    synchronized boolean vigente(long id){return !fechada&&id==geracao;}
    synchronized void fechar(){fechada=true;++geracao;}
}
