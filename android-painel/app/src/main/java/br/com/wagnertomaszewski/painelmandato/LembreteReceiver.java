package br.com.wagnertomaszewski.painelmandato;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class LembreteReceiver extends BroadcastReceiver {
    private static final String CANAL = "agenda_mandato_v1";

    @Override public void onReceive(Context context, Intent intent) {
        if (!"ativo".equals(Lembretes.estado(context))) return;
        int id = intent.getIntExtra("id", 0);
        int prazo = intent.getIntExtra("intervalo", 0);
        String titulo = intent.getStringExtra("titulo");
        if (id <= 0 || (prazo != 24 && prazo != 1)) return;
        String texto = prazo == 24 ? "Amanhã: " : "Em aproximadamente 1 hora: ";
        mostrar(context, id * 2 + (prazo == 24 ? 0 : 1), texto + (titulo == null ? "Compromisso do mandato" : titulo));
    }

    static void mostrar(Context context, int id, String mensagem) {
        if (!Lembretes.permissao(context)) return;
        NotificationManager nm = (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel canal = new NotificationChannel(CANAL, "Compromissos do mandato", NotificationManager.IMPORTANCE_DEFAULT);
            canal.setDescription("Avisos particulares da agenda do vereador");
            canal.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            nm.createNotificationChannel(canal);
        }
        Intent abrir = new Intent(context, MainActivity.class);
        abrir.putExtra("abrirAgenda", true);
        abrir.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent clique = PendingIntent.getActivity(context, id, abrir,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, CANAL) : new Notification.Builder(context);
        builder.setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("Painel do Mandato • Minha Agenda")
            .setContentText(mensagem)
            .setStyle(new Notification.BigTextStyle().bigText(mensagem))
            .setContentIntent(clique)
            .setAutoCancel(true)
            .setVisibility(Notification.VISIBILITY_PRIVATE);
        nm.notify(id, builder.build());
    }
}
