package br.com.wagnertomaszewski.painelmandato;
import java.io.*;
import java.net.URI;

/** Credencial transitória. Somente EnvelopeSessao.selar(...) pode ser persistido pelo controlador. */
final class CredencialCidadao {
    static final long VALIDADE_MS=24L*60*60*1000;
    final String protocolo,chave; final long criadaEm,expiraEm;
    private CredencialCidadao(String p,String c,long criada,long expira)throws IOException{
        if(p==null||p.trim().isEmpty()||p.length()>80||java.util.regex.Pattern.compile("[\\p{Cntrl}]").matcher(p).find()||c==null||!c.matches("[A-Za-z0-9_-]{43}")||criada<0||expira-criada!=VALIDADE_MS)throw new IOException("Credencial inválida");
        protocolo=p.trim();chave=c;criadaEm=criada;expiraEm=expira;
    }
    static CredencialCidadao nova(String p,String c,long agora)throws IOException{return new CredencialCidadao(p,c,agora,Math.addExact(agora,VALIDADE_MS));}
    boolean vigente(long agora){return agora>=criadaEm&&agora<expiraEm;}
    byte[] codificar()throws IOException{ByteArrayOutputStream b=new ByteArrayOutputStream();DataOutputStream d=new DataOutputStream(b);d.writeInt(1);d.writeUTF(protocolo);d.writeUTF(chave);d.writeLong(criadaEm);d.writeLong(expiraEm);return b.toByteArray();}
    static CredencialCidadao ler(byte[] bytes)throws IOException{if(bytes==null||bytes.length>1024)throw new IOException("Credencial inválida");DataInputStream d=new DataInputStream(new ByteArrayInputStream(bytes));if(d.readInt()!=1)throw new IOException("Versão inválida");CredencialCidadao c=new CredencialCidadao(d.readUTF(),d.readUTF(),d.readLong(),d.readLong());if(d.available()!=0)throw new IOException("Credencial inválida");return c;}
    static boolean telaPermitida(String url){try{URI u=new URI(url);return "https".equals(u.getScheme())&&"mandato-neon-homologacao.onrender.com".equals(u.getRawAuthority())&&u.getRawQuery()==null&&(u.getPath().equals("/hml/v2/recuperar")||u.getPath().equals("/hml/v2/recuperar-acesso.html"));}catch(Exception e){return false;}}
    static boolean navegacaoPermitida(String url){try{URI u=new URI(url);return "https".equals(u.getScheme())&&"mandato-neon-homologacao.onrender.com".equals(u.getRawAuthority())&&(u.getPath().startsWith("/hml/v2/")||u.getPath().equals("/hml/mandato/solicitar"));}catch(Exception e){return false;}}
}
