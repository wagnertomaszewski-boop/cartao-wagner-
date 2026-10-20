package br.com.wagnertomaszewski.painelmandato;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

final class Lembretes {
    private static final String PREFS = "agenda_lembretes_v1";
    private static final String LISTA = "compromissos";
    private static final String ATIVADO = "ativado";
    private static final long HORA = 60L * 60L * 1000L;

    private Lembretes() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean permissao(Context c) {
        return Build.VERSION.SDK_INT < 33 ||
            c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    static String estado(Context c) {
        if (!prefs(c).getBoolean(ATIVADO, false)) return "desativado";
        return permissao(c) ? "ativo" : "bloqueado";
    }

    static void ativar(Context c) {
        prefs(c).edit().putBoolean(ATIVADO, true).apply();
        reagendar(c);
    }

    static void desativar(Context c) {
        cancelarTodos(c, prefs(c).getString(LISTA, "[]"));
        prefs(c).edit().putBoolean(ATIVADO, false).apply();
    }

    static void sincronizar(Context c, String novoJson) {
        // Apenas título e horário da agenda autenticada; nenhuma anotação ou endereço privado.
        if (novoJson == null || novoJson.length() > 100000) return;
        try {
            JSONArray eventos = new JSONArray(novoJson);
            if (eventos.length() > 250) return;
            String antigo = prefs(c).getString(LISTA, "[]");
            cancelarTodos(c, antigo);
            prefs(c).edit().putString(LISTA, novoJson).apply();
            if (prefs(c).getBoolean(ATIVADO, false) && permissao(c)) programar(c, novoJson);
        } catch (Exception ignored) { }
    }

    static void reagendar(Context c) {
        if (prefs(c).getBoolean(ATIVADO, false) && permissao(c))
            programar(c, prefs(c).getString(LISTA, "[]"));
    }

    private static Intent intent(Context c, int id, int intervalo, String titulo, long inicio) {
        Intent i = new Intent(c, LembreteReceiver.class);
        i.setAction("br.com.wagnertomaszewski.painelmandato.LEMBRETE");
        i.setData(Uri.parse("mandato-lembrete://compromisso/" + id + "/" + intervalo));
        i.putExtra("id", id);
        i.putExtra("intervalo", intervalo);
        i.putExtra("titulo", titulo);
        i.putExtra("inicio", inicio);
        return i;
    }

    private static PendingIntent pendente(Context c, int id, int intervalo, String titulo, long inicio, boolean existente) {
        return PendingIntent.getBroadcast(
            c, id * 2 + (intervalo == 24 ? 0 : 1),
            intent(c, id, intervalo, titulo, inicio),
            (existente ? PendingIntent.FLAG_NO_CREATE : PendingIntent.FLAG_UPDATE_CURRENT)
                | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void cancelarTodos(Context c, String json) {
        AlarmManager alarmes = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (alarmes == null) return;
        try {
            JSONArray eventos = new JSONArray(json);
            for (int n = 0; n < eventos.length(); n++) {
                int id = eventos.optJSONObject(n).optInt("id", -1);
                if (id < 1 || id > 100000000) continue;
                for (int prazo : new int[]{24, 1}) {
                    PendingIntent pi = pendente(c, id, prazo, "", 0, true);
                    if (pi != null) { alarmes.cancel(pi); pi.cancel(); }
                }
            }
        } catch (Exception ignored) { }
    }

    private static void programar(Context c, String json) {
        AlarmManager alarmes = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (alarmes == null) return;
        long agora = System.currentTimeMillis();
        try {
            JSONArray eventos = new JSONArray(json);
            for (int n = 0; n < eventos.length() && n < 250; n++) {
                JSONObject e = eventos.optJSONObject(n);
                if (e == null) continue;
                int id = e.optInt("id", -1);
                long inicio = e.optLong("inicio", 0);
                String titulo = e.optString("titulo", "Compromisso do mandato");
                String situacao = e.optString("situacao", "");
                if (id < 1 || id > 100000000 || inicio <= agora ||
                    inicio > agora + 366L * 24L * HORA ||
                    situacao.equals("cancelado") || situacao.equals("realizado")) continue;
                if (titulo.length() > 120) titulo = titulo.substring(0, 120);
                for (int prazo : new int[]{24, 1}) {
                    long disparo = inicio - prazo * HORA;
                    if (disparo <= agora) continue;
                    // Inexato por design: não solicita permissão especial de alarmes exatos.
                    alarmes.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, disparo,
                        pendente(c, id, prazo, titulo, inicio, false));
                }
            }
        } catch (Exception ignored) { }
    }
}
