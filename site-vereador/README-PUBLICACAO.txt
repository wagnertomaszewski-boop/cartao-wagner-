SITE WAGNER TOMASZEWSKI - PACOTE PARA PUBLICACAO V4
Domínio pretendido: www.vereadorwagner.com.br (AINDA NAO PUBLICADO)
Hospedagem sugerida: Cloudflare Pages - projeto separado do app.
Arquivos na raiz: index.html, styles.css, script.js, robots.txt, sitemap.xml, assets/, mandato-em-acao/, projetos/, noticias/.

CUIDADO - E-MAIL FUNCIONANDO
O DNS do dominio está atualmente no Registro.br e o e-mail profissional usa Zoho e ZeptoMail.
NUNCA substituir nameservers nem remover registros MX, SPF, DKIM, DMARC ou bounce/ZeptoMail.
Na Cloudflare Pages, adicionar WWW COMO DOMINIO PERSONALIZADO ao NOVO PROJETO (NAO ao projeto do app).
Após adicionar como custom domain no Pages, criar APENAS CNAME no DNS do Registro.br:
Host: www
Tipo: CNAME
Destino: <nome-exato-do-novo-projeto>.pages.dev
Não apontar WWW para o projeto que hospeda o app.
Sem www: configurar redirecionamento com segurança posteriormente, sem trocar nameservers às cegas.

GOOGLE SEARCH CONSOLE
Depois da publicação verificar o dominio (TXT Google sem modificar registros existentes) e enviar sitemap: https://www.vereadorwagner.com.br/sitemap.xml
A indexação não é imediata nem garantida.

O site é estático, sem formulários de coleta de dados. Imagens do aplicativo são capturas reais enviadas pelo autor.
A linkagem para a V2 web do app permanece no destino original e deve ser testada antes de divulgar.
