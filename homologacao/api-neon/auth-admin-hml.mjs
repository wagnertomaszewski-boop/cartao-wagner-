// Autenticação nova e isolada. Nunca reutiliza sessões ou credenciais Supabase.
import {betterAuth} from 'better-auth';
import {twoFactor} from 'better-auth/plugins';
import {createHash,timingSafeEqual,randomUUID} from 'node:crypto';
export const HML_ORIGIN='https://mandato-neon-homologacao.onrender.com';
export const HML_HOST='ep-orange-lab-bezt9o7r.c-9.us-east-2.aws.neon.tech';
export const SCHEMA='auth_admin_hml';
export function validarConfigAuthHml(env){
 if(env.MANDATO_AMBIENTE!=='homologacao'||env.AUTH_HML_ORIGIN!==HML_ORIGIN)throw Error('Autenticação restrita à homologação');
 const u=new URL(env.AUTH_HML_DATABASE_URL);
 if(u.hostname!==HML_HOST||decodeURIComponent(u.username)!=='mandato_auth_hml'||u.pathname!=='/neondb'||!u.password||u.search)
  throw Error('Banco de autenticação de homologação inválido');
 if(!env.AUTH_HML_SECRET||env.AUTH_HML_SECRET.length<48||!env.AUTH_HML_BOOTSTRAP_TOKEN||env.AUTH_HML_BOOTSTRAP_TOKEN.length<48)
  throw Error('Segredos independentes obrigatórios');
 if(env.AUTH_HML_ADMIN_EMAIL!=='wagner.tomaszewski@gmail.com')throw Error('Administrador de homologação não autorizado');
 return {connectionString:u.href,ssl:{rejectUnauthorized:true},max:3,connectionTimeoutMillis:5000};
}
export function criarAuthAdminHml({database,secret,origin=HML_ORIGIN,adminEmail,secure=true}){
 return betterAuth({appName:'Mandato — HOMOLOGAÇÃO',baseURL:origin,basePath:'/hml/auth',secret,database,
  trustedOrigins:[origin],logger:{disabled:true},
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:false},
  session:{expiresIn:3600,updateAge:0,cookieCache:{enabled:false}},
  advanced:{useSecureCookies:secure,cookiePrefix:'mandato_hml',database:{generateId:()=>randomUUID()},
   defaultCookieAttributes:{httpOnly:true,secure,sameSite:'strict'}},
  rateLimit:{enabled:true,storage:'database',window:60,max:20,customRules:{'/sign-in/email':{window:60,max:5},'/two-factor/verify-totp':{window:60,max:5}}},
  databaseHooks:{user:{create:{before:async user=>{
   if(user.email.toLowerCase()!==adminEmail)throw Error('Cadastro restrito');
   return {data:user};
  }}}},
  plugins:[twoFactor({issuer:'Mandato Homologação',skipVerificationOnEnable:false,allowPasswordless:false,totpOptions:{digits:6,period:30}})]
 });
}
export function segredoIgual(a,b){const h=x=>createHash('sha256').update(String(x)).digest();return timingSafeEqual(h(a),h(b));}
// Uma conta com MFA ativado não prova que esta sessão passou pelo segundo fator.
export async function exigirAdminMfa({auth,pool,headers,adminEmail,agora=Date.now()}){
 const s=await auth.api.getSession({headers});
 if(!s||s.user.email!==adminEmail||s.user.twoFactorEnabled!==true)throw Object.assign(Error('Login e MFA necessários'),{status:401});
 const r=await pool.query('SELECT confirmado_em FROM auth_admin_hml.mfa_sessoes WHERE sessao_id=$1 AND usuario_id=$2',[s.session.id,s.user.id]);
 const t=r.rows[0]?.confirmado_em;
 if(!t||agora-new Date(t).getTime()>300000||new Date(t).getTime()>agora)throw Object.assign(Error('Confirme novamente o MFA'),{status:403});
 return {usuarioId:s.user.id,sessaoId:s.session.id};
}
