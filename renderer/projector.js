const s=document.getElementById('s');
function fit(t,size){t.style.fontSize=size+'px';let n=0;while((t.scrollHeight>s.clientHeight*0.8||t.scrollWidth>s.clientWidth*0.92)&&size>18&&n++<60){size-=3;t.style.fontSize=size+'px'}}
api.onProject(p=>{const c=p.settings||{};s.style.background=c.bg||'#000';s.style.color=c.fg||'#fff';s.innerHTML='';
 if(p.mode==='logo'){if(c.logo){const i=new Image();i.src=c.logo;s.append(i)}else{const d=document.createElement('div');d.style.fontSize='6vw';d.textContent=c.church||'';s.append(d)}return}
 if(p.mode!=='slide')return;
 const t=document.createElement('div');t.id='t';t.textContent=p.text;s.append(t);
 if(p.ref){const r=document.createElement('div');r.id='r';r.style.fontSize=(c.size||60)*0.5+'px';r.textContent=p.ref;s.append(r)}
 fit(t,+(c.size||60)*(innerWidth/1920*1.6||1));});
