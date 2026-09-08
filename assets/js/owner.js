const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat('ar').format(Number(n || 0));
let items = [];

function toast(msg, error=false){const t=$('#toast');t.textContent=msg;t.className='toast show'+(error?' error':'');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.className='toast',3000);}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function slugify(v=''){return v.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-');}

async function requireOwner(){
  if(Zero9DB.isDemo){$('#loginView .secure-note').innerHTML='الموقع يعمل الآن بوضع العرض. فعّل Supabase في <b>assets/js/config.js</b> ثم نفّذ <b>supabase/setup.sql</b> لإنشاء حساب Owner حقيقي.';return false;}
  const ok=await Zero9DB.isOwner();
  if(ok){showDashboard();await refresh();return true;}
  return false;
}

function showDashboard(){$('#loginView').hidden=true;$('#dashboardView').hidden=false;}
function showLogin(){$('#dashboardView').hidden=true;$('#loginView').hidden=false;}

async function refresh(){
  try{
    items=await Zero9DB.listLocalizations();
    $('#statGames').textContent=fmt(items.length);
    $('#statViews').textContent=fmt(items.reduce((a,x)=>a+Number(x.views||0),0));
    $('#statDownloads').textContent=fmt(items.reduce((a,x)=>a+Number(x.downloads||0),0));
    $('#statFeatured').textContent=fmt(items.filter(x=>x.featured).length);
    $('#itemsBody').innerHTML=items.length?items.map(x=>`<tr>
      <td><div class="table-title"><img src="${esc(x.cover_url||'assets/demo/cover-1.svg')}" alt=""><div><strong dir="auto">${esc(x.title)}</strong><small>${esc(x.arabic_title||'')}</small></div></div></td>
      <td>${esc(x.category||'—')}</td><td>${esc(x.version||'—')}</td><td>${fmt(x.views)}</td><td>${fmt(x.downloads)}</td>
      <td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-edit="${esc(x.id)}">تعديل</button><button class="btn btn-danger btn-sm" data-delete="${esc(x.id)}">حذف</button></div></td>
    </tr>`).join(''):'<tr><td colspan="6">لا توجد تعريبات بعد.</td></tr>';
  }catch(e){toast(e.message,true);}
}

function resetForm(){
  $('#editorForm').reset(); $('#fId').value=''; $('#modalTitle').textContent='إضافة تعريب';
}
function openEditor(item=null){
  resetForm();
  if(item){
    $('#modalTitle').textContent='تعديل التعريب'; $('#fId').value=item.id||''; $('#fTitle').value=item.title||''; $('#fArabicTitle').value=item.arabic_title||''; $('#fSlug').value=item.slug||''; $('#fCategory').value=item.category||''; $('#fVersion').value=item.version||''; $('#fStatus').value=item.status||'مكتمل'; $('#fShort').value=item.short_description||''; $('#fDescription').value=item.description||''; $('#fCover').value=item.cover_url||''; $('#fDownload').value=item.download_url||''; $('#fFeatured').checked=!!item.featured;
    const shots=Array.isArray(item.screenshots)?item.screenshots:[]; for(let i=1;i<=4;i++) $('#fShot'+i).value=shots[i-1]||'';
  }
  $('#editorModal').classList.add('open');
}
function closeEditor(){$('#editorModal').classList.remove('open');}

async function uploadOptional(fileInputId, currentUrl, folder){
  const file=$(fileInputId).files?.[0];
  return file ? await Zero9DB.uploadMedia(file,folder) : currentUrl.trim();
}

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault(); const btn=e.submitter; btn.disabled=true; btn.textContent='جارٍ التحقق...';
  try{
    await Zero9DB.signIn($('#email').value.trim(),$('#password').value);
    if(!(await Zero9DB.isOwner())){await Zero9DB.signOut();throw new Error('هذا الحساب ليس ضمن حسابات Owner المصرح لها.');}
    showDashboard(); await refresh();
  }catch(err){toast(err.message,true);}finally{btn.disabled=false;btn.textContent='دخول لوحة التحكم';}
});

$('#logoutBtn').addEventListener('click',async()=>{await Zero9DB.signOut();showLogin();});
$('#refreshBtn').addEventListener('click',refresh); $('#addBtn').addEventListener('click',()=>openEditor());
$('#modalClose').addEventListener('click',closeEditor); $('#cancelBtn').addEventListener('click',closeEditor); $('#editorModal').addEventListener('click',e=>{if(e.target===$('#editorModal'))closeEditor();});
$('#fTitle').addEventListener('input',()=>{if(!$('#fId').value || !$('#fSlug').value.trim()) $('#fSlug').value=slugify($('#fTitle').value);});

$('#itemsBody').addEventListener('click',async e=>{
  const edit=e.target.closest('[data-edit]'); const del=e.target.closest('[data-delete]');
  if(edit){const item=items.find(x=>x.id===edit.dataset.edit);if(item)openEditor(item);}
  if(del){const item=items.find(x=>x.id===del.dataset.delete);if(!item)return; if(!confirm(`حذف تعريب «${item.title}» نهائيًا؟`))return; try{await Zero9DB.deleteLocalization(item.id);toast('تم حذف التعريب.');await refresh();}catch(err){toast(err.message,true);}}
});

$('#editorForm').addEventListener('submit',async e=>{
  e.preventDefault(); const btn=$('#saveBtn'); btn.disabled=true; const old=btn.textContent; btn.textContent='جارٍ الحفظ...';
  try{
    const cover=await uploadOptional('#fCoverFile',$('#fCover').value,'covers');
    const shots=[]; for(let i=1;i<=4;i++){const url=await uploadOptional(`#fShotFile${i}`,$(`#fShot${i}`).value,'screenshots');if(url)shots.push(url);}
    const payload={
      id:$('#fId').value||undefined, title:$('#fTitle').value.trim(), arabic_title:$('#fArabicTitle').value.trim(), slug:slugify($('#fSlug').value), category:$('#fCategory').value.trim(), version:$('#fVersion').value.trim(), status:$('#fStatus').value, short_description:$('#fShort').value.trim(), description:$('#fDescription').value.trim(), cover_url:cover, screenshots:shots, download_url:$('#fDownload').value.trim(), featured:$('#fFeatured').checked
    };
    if(!payload.title||!payload.slug||!payload.download_url)throw new Error('أكمل الحقول الإلزامية.');
    await Zero9DB.saveLocalization(payload); toast('تم حفظ التعريب بنجاح.'); closeEditor(); await refresh();
  }catch(err){toast(err.message,true);}finally{btn.disabled=false;btn.textContent=old;}
});

requireOwner().catch(e=>toast(e.message,true));
