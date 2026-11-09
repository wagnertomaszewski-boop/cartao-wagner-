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
    static boolean origemPermitida(String url){return url!=null&&url.startsWith("https://mandato-neon-homologacao.onrender.com/hml/");}
    static boolean exigeLoginCompleto(boolean retomada,String metodo,String url){
        return retomada&&origemPermitida(url)&&!"GET".equals(metodo)&&!"HEAD".equals(metodo)&&!url.startsWith("https://mandato-neon-homologacao.onrender.com/hml/auth/");
    }
    static String cookieSessao(String cookies){
        if(cookies==null||cookies.length()>16384||cookies.indexOf('\r')>=0||cookies.indexOf('\n')>=0)return null;
        for(String parte:cookies.split(";")){String p=parte.trim();if(p.startsWith("__Secure-mandato_hml.session_token=")&&p.length()>40&&p.length()<8192)return p;}
        return null;
    }
}
