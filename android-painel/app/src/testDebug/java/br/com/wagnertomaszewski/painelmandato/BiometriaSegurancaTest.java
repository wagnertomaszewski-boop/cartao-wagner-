package br.com.wagnertomaszewski.painelmandato;
import org.junit.Test;
import static org.junit.Assert.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import javax.crypto.Cipher;

public class BiometriaSegurancaTest {
    private KeyPair par()throws Exception{KeyPairGenerator g=KeyPairGenerator.getInstance("RSA");g.initialize(2048);return g.generateKeyPair();}
    @Test public void envelopeProtegeSessaoERestauraSomenteComChaveCorreta()throws Exception{
        KeyPair p=par();byte[] original="__Secure-mandato_hml.session_token=SESSAO_FICTICIA_NAO_USAR".getBytes(StandardCharsets.UTF_8);
        byte[] cifrado=EnvelopeSessao.selar(original,p.getPublic());
        assertFalse(new String(cifrado,StandardCharsets.ISO_8859_1).contains("SESSAO_FICTICIA_NAO_USAR"));
        assertArrayEquals(original,EnvelopeSessao.abrir(EnvelopeSessao.ler(cifrado),EnvelopeSessao.rsa(Cipher.DECRYPT_MODE,p.getPrivate())));
        assertFalse(java.util.Arrays.equals(cifrado,EnvelopeSessao.selar(original,p.getPublic())));
    }
    @Test public void adulteracaoNaoLiberaSessao()throws Exception{KeyPair p=par();byte[] e=EnvelopeSessao.selar("sessao-ficticia".getBytes(),p.getPublic());e[e.length-1]^=1;assertThrows(GeneralSecurityException.class,()->EnvelopeSessao.abrir(EnvelopeSessao.ler(e),EnvelopeSessao.rsa(Cipher.DECRYPT_MODE,p.getPrivate())));}
    @Test public void outraChaveNaoDesbloqueiaEnvelope()throws Exception{KeyPair a=par(),b=par();byte[] e=EnvelopeSessao.selar("sessao-ficticia".getBytes(),a.getPublic());assertThrows(GeneralSecurityException.class,()->EnvelopeSessao.abrir(EnvelopeSessao.ler(e),EnvelopeSessao.rsa(Cipher.DECRYPT_MODE,b.getPrivate())));}
    @Test public void arquivoTruncadoOuVersaoInvalidaNaoDesbloqueia()throws Exception{KeyPair p=par();byte[] e=EnvelopeSessao.selar("sessao-ficticia".getBytes(),p.getPublic());assertThrows(IOException.class,()->EnvelopeSessao.ler(java.util.Arrays.copyOf(e,e.length-1)));e[3]=2;assertThrows(IOException.class,()->EnvelopeSessao.ler(e));assertThrows(IOException.class,()->EnvelopeSessao.ler(new byte[12000]));}
    @Test public void sessaoVaziaOuExcessivaNaoPodeSerSalva()throws Exception{KeyPair p=par();assertThrows(IOException.class,()->EnvelopeSessao.selar(new byte[0],p.getPublic()));assertThrows(IOException.class,()->EnvelopeSessao.selar(new byte[8193],p.getPublic()));}
    @Test public void sessaoExpiradaRevogadaOuSemMfaRecenteExigeLoginCompleto(){for(int m=0;m<7;m++){PoliticaBiometria p=new PoliticaBiometria();assertFalse(p.validarServidor((m&1)!=0,(m&2)!=0,(m&4)!=0));assertEquals(PoliticaBiometria.Resultado.LOGIN_COMPLETO,p.estado());}assertTrue(new PoliticaBiometria().validarServidor(true,true,true));}
    @Test public void cancelamentoEFalhaPermanecemBloqueadosAteNovaValidacao(){PoliticaBiometria p=new PoliticaBiometria();p.validarServidor(true,true,true);p.bloquear();p.canceladaOuFalhou();assertEquals(PoliticaBiometria.Resultado.BLOQUEADA,p.estado());assertTrue(p.validarServidor(true,true,true));}
    @Test public void chaveInvalidadaPorMudancaDeCadastroExigeLogin(){PoliticaBiometria p=new PoliticaBiometria();p.validarServidor(true,true,true);p.chaveInvalidada();assertEquals(PoliticaBiometria.Resultado.LOGIN_COMPLETO,p.estado());}
    @Test public void somenteOrigemEPathHomologadosAceitos(){assertTrue(PoliticaBiometria.origemPermitida("https://mandato-neon-homologacao.onrender.com/hml/"));for(String u:new String[]{null,"http://mandato-neon-homologacao.onrender.com/hml/","https://mandato-neon-homologacao.onrender.com.evil/hml/","https://wagnertomaszewski-boop.github.io/cartao-wagner-/painel/","https://mandato-neon-homologacao.onrender.com/hml-externo/"})assertFalse(PoliticaBiometria.origemPermitida(u));}
    @Test public void retomadaBiometricaExigeLoginNovoAntesDeAlterarDados(){String base="https://mandato-neon-homologacao.onrender.com/hml/";assertTrue(PoliticaBiometria.exigeLoginCompleto(true,"POST",base+"manual/pedidos/ficticio/emitir"));assertTrue(PoliticaBiometria.exigeLoginCompleto(true,"POST",base+"modelo/solicitacoes"));assertFalse(PoliticaBiometria.exigeLoginCompleto(false,"POST",base+"manual/pedidos/ficticio/decidir"));assertFalse(PoliticaBiometria.exigeLoginCompleto(true,"GET",base+"modelo/dashboard"));assertFalse(PoliticaBiometria.exigeLoginCompleto(true,"POST",base+"auth/sign-in/email"));}
    @Test public void capturaApenasTokenSeguroSemSenhaOuCookiesDeMfa(){String token="__Secure-mandato_hml.session_token=TOKEN_FICTICIO_LONGO";assertEquals(token,PoliticaBiometria.cookieSessao("outro=ignorar; "+token+"; __Secure-mandato_hml.two_factor=NAO_SALVAR"));assertNull(PoliticaBiometria.cookieSessao("mandato_hml.session_token=nao-seguro"));assertNull(PoliticaBiometria.cookieSessao(token+"\r\nOutra: cabecalho"));}
}
