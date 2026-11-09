package br.com.wagnertomaszewski.painelmandato;

import java.io.*;
import java.security.*;
import java.security.spec.MGF1ParameterSpec;
import java.util.Arrays;
import javax.crypto.*;
import javax.crypto.spec.*;

/** Somente bytes criptografados são persistidos. Sem dependência de Android para ensaio JVM. */
final class EnvelopeSessao {
    private static final int VERSAO = 1;
    static Cipher rsa(int modo, Key chave) throws GeneralSecurityException {
        Cipher c = Cipher.getInstance("RSA/ECB/OAEPPadding");
        c.init(modo, chave, new OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA1, PSource.PSpecified.DEFAULT));
        return c;
    }
    static byte[] selar(byte[] sessao, PublicKey publica) throws GeneralSecurityException, IOException {
        if (sessao == null || sessao.length < 1 || sessao.length > 8192) throw new IOException("Sessão inválida");
        byte[] chave = new byte[32], iv = new byte[12]; new SecureRandom().nextBytes(chave); new SecureRandom().nextBytes(iv);
        try {
            Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
            aes.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(chave, "AES"), new GCMParameterSpec(128, iv));
            aes.updateAAD(new byte[]{VERSAO});
            byte[] cifrado = aes.doFinal(sessao), encapsulada = rsa(Cipher.ENCRYPT_MODE, publica).doFinal(chave);
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream out = new DataOutputStream(bytes);
            out.writeInt(VERSAO); out.writeInt(encapsulada.length); out.write(encapsulada); out.write(iv); out.writeInt(cifrado.length); out.write(cifrado);
            return bytes.toByteArray();
        } finally { Arrays.fill(chave, (byte)0); }
    }
    static byte[][] ler(byte[] envelope) throws IOException {
        if (envelope == null || envelope.length > 10000) throw new IOException("Envelope inválido");
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(envelope));
        if (in.readInt() != VERSAO) throw new IOException("Versão inválida");
        int n = in.readInt(); if(n != 256)throw new IOException("Chave inválida");
        byte[] chave = new byte[n], iv = new byte[12]; in.readFully(chave); in.readFully(iv);
        int tamanho = in.readInt(); if(tamanho < 17 || tamanho > 8208 || in.available() != tamanho)throw new IOException("Tamanho inválido");
        byte[] cifrado = new byte[tamanho]; in.readFully(cifrado); return new byte[][]{chave,iv,cifrado};
    }
    static byte[] abrir(byte[][] envelope, Cipher autenticado) throws GeneralSecurityException {
        byte[] chave = autenticado.doFinal(envelope[0]);
        try {
            if(chave.length != 32)throw new GeneralSecurityException("Chave inválida");
            Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
            aes.init(Cipher.DECRYPT_MODE,new SecretKeySpec(chave,"AES"),new GCMParameterSpec(128,envelope[1]));aes.updateAAD(new byte[]{VERSAO});
            return aes.doFinal(envelope[2]);
        } finally { Arrays.fill(chave,(byte)0); }
    }
}
