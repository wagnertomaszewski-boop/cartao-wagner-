package br.com.wagnertomaszewski.painelmandato;

final class PoliticaBiometria {
    enum Resultado { ABERTA, BLOQUEADA, LOGIN_COMPLETO }
    private Resultado estado = Resultado.BLOQUEADA;
    Resultado estado(){return estado;}
    void bloquear(){estado=Resultado.BLOQUEADA;}
    void canceladaOuFalhou(){estado=Resultado.BLOQUEADA;}
    void chaveInvalidada(){estado=Resultado.LOGIN_COMPLETO;}
    boolean validarServidor(boolean autenticado,boolean mfaAtivado,boolean mfaRecente){
        estado=autenticado&&mfaAtivado&&mfaRecente?Resultado.ABERTA:Resultado.LOGIN_COMPLETO;
        return estado==Resultado.ABERTA;
    }
    static boolean origemPermitida(String url){
        if(url==null)return false;
        try{java.net.URI u=new java.net.URI(url);return "https".equals(u.getScheme())&&"wagnertomaszewski-boop.github.io".equals(u.getHost())&&u.getPort()==-1&&u.getUserInfo()==null&&u.getQuery()==null&&"/cartao-wagner-/painel/index.html".equals(u.getPath());}catch(Exception e){return false;}
    }
    static boolean navegacaoPermitida(String url){return origemPermitida(url)||(url!=null&&origemPermitida(url.replace("/painel/agenda.html","/painel/index.html")));}
    static boolean exigeLoginCompleto(boolean retomada,String metodo,String url){
        if(!retomada||"GET".equals(metodo)||"HEAD".equals(metodo)||"OPTIONS".equals(metodo))return false;
        if("https://pmmsdjozyyxkbuqlkfpb.supabase.co/auth/v1/logout?scope=local".equals(url))return false;
        return url!=null&&url.startsWith("https://pmmsdjozyyxkbuqlkfpb.supabase.co/");
    }
}
