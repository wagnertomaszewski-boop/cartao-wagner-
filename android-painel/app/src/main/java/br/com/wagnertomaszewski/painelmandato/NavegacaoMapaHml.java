package br.com.wagnertomaszewski.painelmandato;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Somente coordenadas; não aceita outros destinos, credenciais ou parâmetros.
final class NavegacaoMapaHml {
    private static final Pattern COORDENADAS = Pattern.compile("api=1&query=([-+0-9.eE]+),([-+0-9.eE]+)");
    static boolean permitida(String url) {
        try {
            URI u = new URI(url);
            if (!"https".equals(u.getScheme()) || !"www.google.com".equals(u.getRawAuthority())
                    || !"/maps/search/".equals(u.getPath()) || u.getRawFragment() != null) return false;
            Matcher m = COORDENADAS.matcher(u.getQuery() == null ? "" : u.getQuery());
            if (!m.matches()) return false;
            double lat = Double.parseDouble(m.group(1)), lng = Double.parseDouble(m.group(2));
            return Double.isFinite(lat) && Double.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        } catch (Exception ignored) { return false; }
    }
}
