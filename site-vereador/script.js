const toggle=document.querySelector('.nav-toggle');
const menu=document.querySelector('#menu');
if(toggle&&menu){
  const closeMenu=()=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menu');};
  toggle.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!toggle.contains(e.target))closeMenu();});
}
const ano=document.getElementById('ano');if(ano)ano.textContent=new Date().getFullYear();
const sections=[...document.querySelectorAll('section[id]')];
const links=[...document.querySelectorAll('.nav-link')];
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+entry.target.id));}});},{rootMargin:'-25% 0px -62% 0px'});
  sections.forEach(s=>observer.observe(s));
}
