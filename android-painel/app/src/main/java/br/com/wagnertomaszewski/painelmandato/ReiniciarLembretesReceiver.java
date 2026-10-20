package br.com.wagnertomaszewski.painelmandato;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class ReiniciarLembretesReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Lembretes.reagendar(context);
        }
    }
}
