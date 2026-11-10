package br.com.wagnertomaszewski.painelmandato;
import org.junit.Test;
import static org.junit.Assert.*;
public class NavegacaoMapaHmlTest {
    @Test public void coordenadasExatasValidas(){assertTrue(NavegacaoMapaHml.permitida("https://www.google.com/maps/search/?api=1&query=-31.004570880073523%2C-52.04360961914063"));assertTrue(NavegacaoMapaHml.permitida("https://www.google.com/maps/search/?api=1&query=1e-7%2C0"));}
    @Test public void destinosEProtocolosIndevidosSaoBloqueados(){for(String s:new String[]{null,"http://www.google.com/maps/search/?api=1&query=0,0","https://www.google.com.evil/maps/search/?api=1&query=0,0","https://www.google.com@evil.example/maps/search/?api=1&query=0,0","https://www.google.com:443/maps/search/?api=1&query=0,0","https://www.google.com/maps/search/?api=1&query=0,0#chave","https://www.google.com/maps/search/?api=1&query=0,0&chave=segredo","https://www.google.com/maps/search/?api=1&query=91,0","javascript:alert(1)"})assertFalse(s,NavegacaoMapaHml.permitida(s));}
}
