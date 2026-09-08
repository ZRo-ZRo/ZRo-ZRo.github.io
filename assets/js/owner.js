const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat('ar').format(Number(n || 0));
let items = [];

function toast(msg, error=false){
  const t=$('#toast');
  t.textContent=msg;
  t.className='toast show'+(error?' error':'');
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>t.className='toast',3200);
}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function slugify(v=''){return v.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-');}
function setBusy(btn,busy,text){if(!btn)return; if(busy){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=text;}else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent;delete btn.dataset.oldText;}}
function validateHttpUrl(value,label){
  const raw=String(value||'').trim();
  if(!raw)return '';
  try{
    const url=new URL(raw);
    if(!['http:','https:'].includes(url.protocol))throw new Error();
    return url.href;
  }catch(_){throw new Error(`${label} يجب أن يبدأ بـ http:// أو https://`);}
}

async function requireOwner(){
  if(ZRoZRoDB.isDemo){
    $('#loginView .secure-note').innerHTML='الموقع يعمل الآن بوضع العرض. فعّل Supabase في <b>assets/js/config.js</b> ثم نفّذ <b>supabase/setup.sql</b> لإنشاء بيئة الإنتاج.';
    return false;
  }
  const ok=await ZRoZRoDB.isOwner();
  if(ok){showDashboard();await refresh();return true;}
  showLogin();
  return false;
}

function showDashboard(){$('#loginView').hidden=true;$('#dashboardView').hidden=false;}
function showLogin(){$('#dashboardView').hidden=true;$('#loginView').hidden=false;}

async function refresh(){
  try{
    items=await ZRoZRoDB.listLocalizations();
    $('#statGames').textContent=fmt(items.length);
    $('#statViews').textContent=fmt(items.reduce((a,x)=>a+Number(x.views||0),0));
    $('#statDownloads').textContent=fmt(items.reduce((a,x)=>a+Number(x.downloads||0),0));
    $('#statFeatured').textContent=fmt(items.filter(x=>x.featured).length);
    $('#itemsBody').innerHTML=items.length?items.map(x=>`<tr>
      <td><div class="table-title"><img src="${esc(x.cover_url||'assets/demo/cover-1.svg')}" alt="" loading="lazy" decoding="async"><div><strong dir="auto">${esc(x.title)}</strong><small>${esc(x.arabic_title||'')}</small></div></div></td>
      <td>${esc(x.category||'—')}</td><td>${esc(x.version||'—')}</td><td>${fmt(x.views)}</td><td>${fmt(x.downloads)}</td>
      <td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-edit="${esc(x.id)}">تعديل</button><button class="btn btn-danger btn-sm" data-delete="${esc(x.id)}">حذف</button></div></td>
    </tr>`).join(''):'<tr><td colspan="6">لا توجد تعريبات بعد.</td></tr>';
  }catch(e){toast(e.message||'تعذر تحديث البيانات.',true);}
}

function resetForm(){
  $('#editorForm').reset();
  $('#fId').value='';
  $('#fSlug').dataset.touched='';
  $('#modalTitle').textContent='إضافة تعريب';
}
function openEditor(item=null){
  resetForm();
  if(item){
    $('#modalTitle').textContent='تعديل التعريب';
    $('#fId').value=item.id||'';
    $('#fTitle').value=item.title||'';
    $('#fArabicTitle').value=item.arabic_title||'';
    $('#fSlug').value=item.slug||'';
    $('#fSlug').dataset.touched='1';
    $('#fCategory').value=item.category||'';
    $('#fVersion').value=item.version||'';
    $('#fStatus').value=item.status||'مكتمل';
    $('#fShort').value=item.short_description||'';
    $('#fDescription').value=item.description||'';
    $('#fCover').value=item.cover_url||'';
    $('#fDownload').value=item.download_url||'';
    $('#fFeatured').checked=!!item.featured;
    const shots=Array.isArray(item.screenshots)?item.screenshots:[];
    for(let i=1;i<=4;i++) $('#fShot'+i).value=shots[i-1]||'';
  }
  $('#editorModal').classList.add('open');
  setTimeout(()=>$('#fTitle').focus(),0);
}
function closeEditor(){
  if($('#saveBtn').disabled)return;
  $('#editorModal').classList.remove('open');
}

async function uploadOptional(fileInputId,currentUrl,folder){
  const input=$(fileInputId);
  const file=input?.files?.[0];
  return file ? ZRoZRoDB.uploadMedia(file,folder) : String(currentUrl||'').trim();
}

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter;
  setBusy(btn,true,'جارٍ التحقق...');
  try{
    await ZRoZRoDB.signIn($('#email').value.trim(),$('#password').value);
    if(!(await ZRoZRoDB.isOwner())){
      await ZRoZRoDB.signOut();
      throw new Error('هذا الحساب ليس ضمن حسابات Owner المصرح لها.');
    }
    showDashboard();
    await refresh();
  }catch(err){toast(err.message||'تعذر تسجيل الدخول.',true);}finally{setBusy(btn,false);}
});

$('#logoutBtn').addEventListener('click',async()=>{
  try{await ZRoZRoDB.signOut();showLogin();toast('تم تسجيل الخروج.');}catch(e){toast(e.message,true);}
});
$('#refreshBtn').addEventListener('click',refresh);
$('#addBtn').addEventListener('click',()=>openEditor());
$('#modalClose').addEventListener('click',closeEditor);
$('#cancelBtn').addEventListener('click',closeEditor);
$('#editorModal').addEventListener('click',e=>{if(e.target===$('#editorModal'))closeEditor();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#editorModal').classList.contains('open'))closeEditor();});
$('#fTitle').addEventListener('input',()=>{if(!$('#fId').value&&!$('#fSlug').dataset.touched)$('#fSlug').value=slugify($('#fTitle').value);});
$('#fSlug').addEventListener('input',()=>{$('#fSlug').dataset.touched='1';$('#fSlug').value=slugify($('#fSlug').value);});

$('#itemsBody').addEventListener('click',async e=>{
  const edit=e.target.closest('[data-edit]');
  const del=e.target.closest('[data-delete]');
  if(edit){const item=items.find(x=>x.id===edit.dataset.edit);if(item)openEditor(item);}
  if(del){
    const item=items.find(x=>x.id===del.dataset.delete);if(!item)return;
    if(!confirm(`حذف تعريب «${item.title}» نهائيًا؟`))return;
    const btn=del;
    setBusy(btn,true,'جارٍ الحذف...');
    try{await ZRoZRoDB.deleteLocalization(item.id);toast('تم حذف التعريب.');await refresh();}
    catch(err){toast(err.message||'تعذر حذف التعريب.',true);}
    finally{setBusy(btn,false);}
  }
});

$('#editorForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('#saveBtn');
  setBusy(btn,true,'جارٍ رفع الصور والحفظ...');
  try{
    const downloadUrl=validateHttpUrl($('#fDownload').value,'رابط التحميل');
    const uploadTasks=[
      uploadOptional('#fCoverFile',$('#fCover').value,'covers'),
      ...[1,2,3,4].map(i=>uploadOptional(`#fShotFile${i}`,$(`#fShot${i}`).value,'screenshots'))
    ];
    const [cover,...shots]=await Promise.all(uploadTasks);

    const payload={
      id:$('#fId').value||undefined,
      title:$('#fTitle').value.trim(),
      arabic_title:$('#fArabicTitle').value.trim(),
      slug:slugify($('#fSlug').value),
      category:$('#fCategory').value.trim(),
      version:$('#fVersion').value.trim(),
      status:$('#fStatus').value,
      short_description:$('#fShort').value.trim(),
      description:$('#fDescription').value.trim(),
      cover_url:cover,
      screenshots:shots.map(x=>String(x||'').trim()),
      download_url:downloadUrl,
      featured:$('#fFeatured').checked
    };

    if(!payload.title||!payload.slug||!payload.download_url)throw new Error('أكمل الحقول الإلزامية: الاسم وSlug ورابط التحميل.');
    await ZRoZRoDB.saveLocalization(payload);
    toast('تم حفظ التعريب بنجاح.');
    $('#editorModal').classList.remove('open');
    await refresh();
  }catch(err){toast(err.message||'تعذر حفظ التعريب.',true);}finally{setBusy(btn,false);}
});

requireOwner().catch(e=>toast(e.message||'تعذر التحقق من صلاحية Owner.',true));
